import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import type { NDKEvent } from '@nostr-dev-kit/ndk'
import type { Federation } from 'src/types/federation'
import type {
  NostrContactSource,
  NostrContactSyncMeta,
  NostrContactSyncStatus,
  SyncedNostrContact,
} from 'src/types/nostr'
import { Nip87Kinds } from 'src/types/nip87'
import { useWalletStore } from './wallet'
import { logger } from 'src/services/logger'
import { raceWithTimeout } from 'src/utils/async'
import { getErrorMessage } from 'src/utils/error'
import {
  applyFederationCandidateToDiscoveryState,
  applyRecommendationCountsToDiscoveryCandidates,
  applyRecommendationTargetsToDiscoveryState,
  doesPreviewMatchCandidate,
  extractFederationCandidate,
  extractRecommendationTargets,
  isExpectedDiscoveryError,
  sortDiscoveredFederationCandidates,
  type DiscoveredFederationCandidate,
} from 'src/services/nostr/discovery'
import {
  compareSyncedContacts,
  getContactSearchValues,
  getInvalidContactSourceMessage,
  inferContactSourceType,
  isValidContactSource,
  normalizeContactSearchValue,
} from 'src/services/nostr/contacts'
import { syncNostrContacts } from 'src/services/nostr/contactSync'
import {
  createCachedFederationPreview,
  isCachedPreviewValid,
  removeCachedPreview as removeCachedPreviewFromCache,
  syncDiscoveredFederationsFromCache as buildDiscoveredFederationsFromCache,
  trimPreviewCache as trimPreviewCacheEntries,
  type CachedFederationPreview,
} from 'src/services/nostr/previewCache'
import {
  initializeNdk,
  stopDiscoverySubscriptions,
  subscribeToFederationDiscovery,
  type NostrEventSubscription,
  type NostrNdkClient,
} from 'src/services/nostr/subscriptions'

type PreviewStatus = 'loading' | 'failed' | 'timed_out' | 'ready'

function createInitialNostrSyncStatus(): NostrContactSyncStatus {
  return 'idle'
}

function createRecommendationVotersByFederation(): Record<string, Record<string, number>> {
  return {}
}

function createNumberLookup(): Record<string, number> {
  return {}
}

function createPreviewStatusLookup(): Record<string, PreviewStatus> {
  return {}
}

const DEFAULT_RELAYS = [
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://relay.damus.io',
  'wss://relay.snort.social',
  'wss://bitcoiner.social',
  'wss://nostr.wine',
  'wss://relay.nostr.band',
]

const DISCOVERY_PAGE_SIZE = 5
const MAX_DISCOVERY_CACHE_SIZE = 50
const PREVIEW_QUEUE_OVERSCAN = 3
const PREVIEW_TIMEOUT_MS = 7_000
const PREVIEW_QUEUE_IDLE_POLL_MS = 50
const PREVIEW_TIMEOUT_TOKEN = Symbol('preview-timeout')
const DEFAULT_CONTACT_SOURCE: NostrContactSource = {
  sourceType: 'nip05',
  sourceValue: '',
  resolvedPubkey: null,
}
const DEFAULT_CONTACT_SYNC_META: NostrContactSyncMeta = {
  lastSyncedAt: null,
  lastSyncError: null,
}
export const useNostrStore = defineStore('nostr', {
  state: () => ({
    relays: useLocalStorage<string[]>('vipr.nostr.relays', DEFAULT_RELAYS),
    pubkey: useLocalStorage<string>('vipr.nostr.pubkey', ''),
    contactSource: useLocalStorage<NostrContactSource>(
      'vipr.nostr.contact-source',
      DEFAULT_CONTACT_SOURCE,
    ),
    contacts: useLocalStorage<SyncedNostrContact[]>('vipr.nostr.contacts', []),
    contactSyncMeta: useLocalStorage<NostrContactSyncMeta>(
      'vipr.nostr.contact-sync-meta',
      DEFAULT_CONTACT_SYNC_META,
    ),
    syncStatus: createInitialNostrSyncStatus(),
    ndk: null as NostrNdkClient | null,
    discoveredFederations: useLocalStorage<Federation[]>('vipr.nostr.discovery.federations', []),
    previewCacheByFederation: useLocalStorage<Record<string, CachedFederationPreview>>(
      'vipr.nostr.discovery.preview-cache',
      {},
    ),
    discoveryCandidates: useLocalStorage<DiscoveredFederationCandidate[]>(
      'vipr.nostr.discovery.candidates',
      [],
    ),
    lastDiscoveryCreatedAt: useLocalStorage<number>('vipr.nostr.discovery.last-created-at', 0),
    lastRecommendationCreatedAt: useLocalStorage<number>(
      'vipr.nostr.discovery.last-recommendation-created-at',
      0,
    ),
    recommendationCountsByFederation: useLocalStorage<Record<string, number>>(
      'vipr.nostr.discovery.recommendation-counts',
      {},
    ),
    recommendationVotersByFederation: createRecommendationVotersByFederation(),
    isDiscoveringFederations: false,
    federationSubscription: null as NostrEventSubscription | null,
    recommendationSubscription: null as NostrEventSubscription | null,
    previewTargetCount: DISCOVERY_PAGE_SIZE,
    previewQueue: [] as string[],
    isPreviewQueueRunning: false,
    isJoinInProgress: false,
    previewAttemptedCreatedAt: createNumberLookup(),
    previewErrorLoggedCreatedAt: createNumberLookup(),
    previewStatusByFederation: createPreviewStatusLookup(),
  }),

  getters: {},
  actions: {
    async addRelay(relay: string) {
      if (!this.relays.includes(relay) && relay.startsWith('wss://')) {
        this.relays.push(relay)
        await this.initNdk()
        return true
      }
      return false
    },

    async removeRelay(relay: string) {
      const index = this.relays.indexOf(relay)
      if (index !== -1) {
        this.relays.splice(index, 1)
        await this.initNdk()
        return true
      }
      return false
    },

    async resetRelays() {
      this.relays = [...DEFAULT_RELAYS]
      await this.initNdk()
    },

    setPubkey(pubkey: string) {
      this.pubkey = pubkey
    },

    setContactSource(sourceValue: string) {
      this.contactSource = {
        sourceType: inferContactSourceType(sourceValue),
        sourceValue,
        resolvedPubkey: null,
      }
    },

    clearContacts() {
      this.contactSource = { ...DEFAULT_CONTACT_SOURCE }
      this.contacts = []
      this.contactSyncMeta = { ...DEFAULT_CONTACT_SYNC_META }
      this.syncStatus = 'idle'
    },

    getSuggestedContacts(query: string): SyncedNostrContact[] {
      const normalizedQuery = normalizeContactSearchValue(query)
      const sortedContacts = [...this.contacts].sort(compareSyncedContacts)

      if (normalizedQuery === '') {
        return sortedContacts
      }

      return sortedContacts.filter((contact) =>
        getContactSearchValues(contact).some((value) => value.includes(normalizedQuery)),
      )
    },

    async syncContacts(): Promise<boolean> {
      const sourceValue = this.contactSource.sourceValue.trim()
      if (sourceValue === '') {
        this.syncStatus = 'error'
        this.contactSyncMeta = {
          ...this.contactSyncMeta,
          lastSyncError: 'Enter a Nostr identifier before syncing contacts.',
        }
        return false
      }

      const sourceType = inferContactSourceType(sourceValue)

      if (!isValidContactSource(sourceType, sourceValue)) {
        this.syncStatus = 'error'
        this.contactSyncMeta = {
          ...this.contactSyncMeta,
          lastSyncError: getInvalidContactSourceMessage(),
        }
        return false
      }

      this.syncStatus = 'syncing'
      this.contactSyncMeta = {
        ...this.contactSyncMeta,
        lastSyncError: null,
      }

      try {
        if (this.ndk === null) {
          await this.initNdk()
        }

        if (this.ndk === null) {
          throw new Error('NDK is not initialized')
        }

        const result = await syncNostrContacts(this.ndk, sourceValue)

        this.contactSource = {
          sourceType,
          sourceValue,
          resolvedPubkey: result.resolvedPubkey,
        }
        this.contacts = result.contacts
        this.contactSyncMeta = {
          lastSyncedAt: Date.now(),
          lastSyncError: null,
        }
        this.syncStatus = 'success'

        logger.nostr.info('Synced Nostr contacts', {
          sourceType,
          count: result.contacts.length,
        })

        return true
      } catch (error) {
        const errorMessage = getErrorMessage(error)
        this.contactSyncMeta = {
          ...this.contactSyncMeta,
          lastSyncError: errorMessage,
        }
        this.syncStatus = 'error'
        logger.error('Failed to sync Nostr contacts', error)
        return false
      }
    },

    getRecommendationCountForFederationId(federationId: string): number {
      return this.recommendationCountsByFederation[federationId] ?? 0
    },

    getCachedPreviewForCandidate(candidate: DiscoveredFederationCandidate): Federation | undefined {
      const cached = this.previewCacheByFederation[candidate.federationId]
      if (!isCachedPreviewValid(cached, candidate)) {
        return undefined
      }

      return cached.federation
    },

    getPreviewStatusForFederationId(federationId: string): PreviewStatus | undefined {
      return this.previewStatusByFederation[federationId]
    },

    setJoinInProgress(isInProgress: boolean) {
      this.isJoinInProgress = isInProgress
    },

    setPreviewTargetCount(count: number) {
      this.previewTargetCount = Math.max(DISCOVERY_PAGE_SIZE, count)
    },

    increasePreviewTarget(count = DISCOVERY_PAGE_SIZE) {
      this.setPreviewTargetCount(this.previewTargetCount + count)
    },

    resetPreviewTargetCount() {
      this.setPreviewTargetCount(DISCOVERY_PAGE_SIZE)
    },

    clearDiscoveryCache() {
      this.discoveredFederations = []
      this.previewCacheByFederation = {}
      this.discoveryCandidates = []
      this.previewQueue = []
      this.previewAttemptedCreatedAt = {}
      this.previewErrorLoggedCreatedAt = {}
      this.previewStatusByFederation = {}
      this.lastDiscoveryCreatedAt = 0
      this.lastRecommendationCreatedAt = 0
      this.recommendationCountsByFederation = {}
      this.recommendationVotersByFederation = {}
    },

    async initNdk() {
      this.ndk = await initializeNdk(this.relays)
    },

    async discoverFederations(options: { reset?: boolean } = {}) {
      if (this.ndk === null) {
        await this.initNdk()
      }
      if (options.reset === true) {
        this.clearDiscoveryCache()
      }
      if (this.federationSubscription != null) {
        this.stopDiscoveringFederations()
      }

      this.isDiscoveringFederations = true
      this.syncDiscoveredFederationsFromCache()
      this.resetPreviewTargetCount()

      if (this.ndk != null) {
        const subscriptions = subscribeToFederationDiscovery(
          this.ndk,
          this.lastDiscoveryCreatedAt,
          {
            onFederationEvent: (event) => {
              this.handleFederationEvent(event)
            },
            onRecommendationEvent: (event) => {
              this.handleRecommendationEvent(event)
            },
          },
        )
        this.federationSubscription = subscriptions.federationSubscription
        this.recommendationSubscription = subscriptions.recommendationSubscription
      } else {
        this.isDiscoveringFederations = false
      }
    },

    handleFederationEvent(event: NDKEvent) {
      if (event.kind !== Nip87Kinds.FediInfo) return

      logger.nostr.debug('Processing federation event', {
        eventId: event.id,
        createdAt: event.created_at,
      })

      const candidate = extractFederationCandidate(event)
      if (candidate == null) {
        return
      }

      this.lastDiscoveryCreatedAt = Math.max(this.lastDiscoveryCreatedAt, candidate.createdAt)

      const update = applyFederationCandidateToDiscoveryState({
        candidates: this.discoveryCandidates,
        candidate,
        recommendationCountsByFederation: this.recommendationCountsByFederation,
        maxCandidates: MAX_DISCOVERY_CACHE_SIZE,
      })

      this.discoveryCandidates = update.candidates
      if (update.invalidatedFederationId != null) {
        if (update.shouldRemoveCachedPreview) {
          this.removeCachedPreview(update.invalidatedFederationId)
        }
        delete this.previewAttemptedCreatedAt[update.invalidatedFederationId]
        delete this.previewStatusByFederation[update.invalidatedFederationId]
      }
    },

    handleRecommendationEvent(event: NDKEvent) {
      if (event.kind !== Nip87Kinds.Recommendation) return
      if (event.pubkey == null || event.pubkey === '') return

      const recommendedFederationIds = extractRecommendationTargets(event)
      if (recommendedFederationIds.length === 0) {
        return
      }

      const createdAt = event.created_at ?? 0
      const update = applyRecommendationTargetsToDiscoveryState({
        candidates: this.discoveryCandidates,
        recommendationCountsByFederation: this.recommendationCountsByFederation,
        recommendationVotersByFederation: this.recommendationVotersByFederation,
        lastRecommendationCreatedAt: this.lastRecommendationCreatedAt,
        pubkey: event.pubkey,
        createdAt,
        federationIds: recommendedFederationIds,
      })

      this.discoveryCandidates = update.candidates
      this.recommendationCountsByFederation = update.recommendationCountsByFederation
      this.recommendationVotersByFederation = update.recommendationVotersByFederation
      this.lastRecommendationCreatedAt = update.lastRecommendationCreatedAt
    },

    applyRecommendationCountsToCandidates() {
      this.discoveryCandidates = applyRecommendationCountsToDiscoveryCandidates(
        this.discoveryCandidates,
        this.recommendationCountsByFederation,
      )
    },

    sortDiscoveryCandidates() {
      this.discoveryCandidates = sortDiscoveredFederationCandidates(this.discoveryCandidates)
    },

    cacheFederationPreview(candidate: DiscoveredFederationCandidate, federation: Federation) {
      this.previewCacheByFederation = {
        ...this.previewCacheByFederation,
        [candidate.federationId]: createCachedFederationPreview(candidate, federation),
      }

      this.trimPreviewCache()
      this.syncDiscoveredFederationsFromCache()
    },

    removeCachedPreview(federationId: string) {
      this.previewCacheByFederation = removeCachedPreviewFromCache(
        this.previewCacheByFederation,
        federationId,
      )
      this.discoveredFederations = this.discoveredFederations.filter(
        (federation) => federation.federationId !== federationId,
      )
    },

    trimPreviewCache() {
      this.previewCacheByFederation = trimPreviewCacheEntries(
        this.previewCacheByFederation,
        MAX_DISCOVERY_CACHE_SIZE,
      )
    },

    syncDiscoveredFederationsFromCache() {
      this.discoveredFederations = buildDiscoveredFederationsFromCache(
        this.previewCacheByFederation,
        this.discoveryCandidates,
      )
    },

    enqueueCandidatesForPreview() {
      const validCandidateIds = new Set(
        this.discoveryCandidates.map((candidate) => candidate.federationId),
      )
      this.previewQueue = this.previewQueue.filter((federationId) => {
        if (!validCandidateIds.has(federationId)) {
          return false
        }

        const candidate = this.discoveryCandidates.find(
          (item) => item.federationId === federationId,
        )
        return candidate != null && this.getCachedPreviewForCandidate(candidate) == null
      })

      const queuedIds = new Set(this.previewQueue)
      const previewWindow = this.discoveryCandidates.slice(
        0,
        this.previewTargetCount + PREVIEW_QUEUE_OVERSCAN,
      )

      for (const candidate of previewWindow) {
        if (this.getCachedPreviewForCandidate(candidate) != null) {
          this.previewStatusByFederation[candidate.federationId] = 'ready'
          continue
        }
        if (queuedIds.has(candidate.federationId)) {
          continue
        }

        const attemptedCreatedAt = this.previewAttemptedCreatedAt[candidate.federationId]
        if (attemptedCreatedAt != null && attemptedCreatedAt >= candidate.createdAt) {
          continue
        }

        this.previewQueue.push(candidate.federationId)
        queuedIds.add(candidate.federationId)
      }
    },

    async processPreviewQueue() {
      if (this.isPreviewQueueRunning || this.isJoinInProgress || !this.isDiscoveringFederations) {
        return
      }

      this.isPreviewQueueRunning = true
      const walletStore = useWalletStore()

      try {
        await walletStore.initClients()

        while (!this.isJoinInProgress && this.isDiscoveringFederations) {
          if (this.previewQueue.length === 0) {
            this.enqueueCandidatesForPreview()
            if (this.previewQueue.length === 0) {
              break
            }
          }

          const federationId = this.previewQueue.shift()
          if (federationId == null || federationId === '') {
            continue
          }

          const candidate = this.discoveryCandidates.find(
            (item) => item.federationId === federationId,
          )
          if (candidate == null) {
            continue
          }

          const cachedPreview = this.getCachedPreviewForCandidate(candidate)
          if (cachedPreview != null) {
            this.previewStatusByFederation[candidate.federationId] = 'ready'
            continue
          }

          this.previewAttemptedCreatedAt[candidate.federationId] = candidate.createdAt
          this.previewStatusByFederation[candidate.federationId] = 'loading'

          const previewPromise = walletStore
            .previewFederation(candidate.inviteCode)
            .catch((error) => {
              this.previewStatusByFederation[candidate.federationId] = 'failed'
              if (isExpectedDiscoveryError(error)) {
                const lastLoggedCreatedAt = this.previewErrorLoggedCreatedAt[candidate.federationId]
                if (lastLoggedCreatedAt == null || lastLoggedCreatedAt < candidate.createdAt) {
                  this.previewErrorLoggedCreatedAt[candidate.federationId] = candidate.createdAt
                  logger.nostr.warn('Skipping federation candidate with unavailable config', {
                    federationId: candidate.federationId,
                    createdAt: candidate.createdAt,
                    reason: getErrorMessage(error),
                  })
                }
              } else {
                logger.error('Unexpected error while previewing federation candidate', {
                  federationId: candidate.federationId,
                  error: getErrorMessage(error),
                })
              }
              return undefined
            })

          // Sequential previews avoid overloading wallet I/O and keep join UX responsive.
          // eslint-disable-next-line no-await-in-loop
          const previewResult = await raceWithTimeout(
            previewPromise,
            PREVIEW_TIMEOUT_MS,
            PREVIEW_TIMEOUT_TOKEN,
          )
          if (previewResult === PREVIEW_TIMEOUT_TOKEN) {
            this.previewStatusByFederation[candidate.federationId] = 'timed_out'
            this.sortDiscoveryCandidates()
            logger.warn('Federation preview timed out', { federationId: candidate.federationId })
            continue
          }

          const federation = previewResult
          if (federation == null) {
            if (this.previewStatusByFederation[candidate.federationId] === 'loading') {
              this.previewStatusByFederation[candidate.federationId] = 'failed'
            }
            this.sortDiscoveryCandidates()
            continue
          }

          if (!doesPreviewMatchCandidate(candidate, federation)) {
            this.previewStatusByFederation[candidate.federationId] = 'failed'
            this.removeCachedPreview(candidate.federationId)
            this.sortDiscoveryCandidates()
            logger.nostr.warn(
              'Skipping federation candidate with mismatched preview federation id',
              {
                federationId: candidate.federationId,
                resolvedFederationId: federation.federationId,
                createdAt: candidate.createdAt,
              },
            )
            continue
          }

          this.previewStatusByFederation[candidate.federationId] = 'ready'
          this.cacheFederationPreview(candidate, federation)
        }
      } catch (error) {
        logger.error('Error processing federation preview queue', error)
      } finally {
        this.isPreviewQueueRunning = false
      }
    },

    async waitForPreviewQueueIdle(timeoutMs = PREVIEW_TIMEOUT_MS + 500) {
      const deadline = Date.now() + timeoutMs
      while (this.isPreviewQueueRunning && Date.now() < deadline) {
        // Allow in-flight preview calls to finish before wallet join/open.
        // eslint-disable-next-line no-await-in-loop
        await new Promise<void>((resolve) => {
          setTimeout(resolve, PREVIEW_QUEUE_IDLE_POLL_MS)
        })
      }

      return !this.isPreviewQueueRunning
    },

    stopDiscoveringFederations() {
      logger.nostr.debug('Stopping federation discovery')
      stopDiscoverySubscriptions({
        federationSubscription: this.federationSubscription,
        recommendationSubscription: this.recommendationSubscription,
      })
      this.federationSubscription = null
      this.recommendationSubscription = null
      this.previewQueue = []
      this.previewAttemptedCreatedAt = {}
      this.previewErrorLoggedCreatedAt = {}
      this.previewStatusByFederation = {}
      this.isDiscoveringFederations = false
    },
  },
})
