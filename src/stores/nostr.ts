import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import NDK, {
  isValidNip05,
  nip19,
  profileFromEvent,
  type NDKEvent,
  type NDKFilter,
  type NDKSubscription,
} from '@nostr-dev-kit/ndk'
import type { Federation } from 'src/types/federation'
import type {
  NostrContactSource,
  NostrContactSourceType,
  NostrContactSyncMeta,
  NostrContactSyncStatus,
  SyncedNostrContact,
} from 'src/types/nostr'
import { Nip87Kinds } from 'src/types/nip87'
import { useWalletStore } from './wallet'
import { logger } from 'src/services/logger'
import { raceWithTimeout } from 'src/utils/async'
import { getErrorMessage } from 'src/utils/error'

type DiscoveredFederationCandidate = {
  federationId: string
  inviteCode: string
  createdAt: number
  displayName?: string
  about?: string
  pictureUrl?: string
  network?: string
  recommendationCount?: number
}

type CachedFederationPreview = {
  federation: Federation
  candidateCreatedAt: number
  inviteCode: string
  cachedAt: number
  completeness: 'full'
}

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
const PREVIEW_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
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
const EXPECTED_DISCOVERY_ERROR_PATTERNS = [
  /failed to download client config/i,
  /failed to fetch/i,
  /networkerror/i,
  /load failed/i,
  /connection timeout/i,
  /security error when calling getdirectory/i,
  /securityerror.*getdirectory/i,
  /operation is insecure/i,
]

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
    ndk: null as NDK | null,
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
    federationSubscription: null as NDKSubscription | null,
    recommendationSubscription: null as NDKSubscription | null,
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

        const sourceUser = await this.ndk.fetchUser(sourceValue)
        if (sourceUser == null) {
          throw new Error('Nostr user not found')
        }

        const followedPubkeys = Array.from(await sourceUser.followSet())
        const profileEvents =
          followedPubkeys.length > 0
            ? await this.ndk.fetchEvents({ kinds: [0], authors: followedPubkeys })
            : new Set<NDKEvent>()
        const latestProfileEvents = getLatestProfileEvents(profileEvents)
        const contacts = followedPubkeys
          .map((pubkey) => {
            const profileEvent = latestProfileEvents.get(pubkey)
            if (profileEvent == null) {
              return null
            }

            return mapProfileEventToContact(pubkey, profileEvent)
          })
          .filter((contact): contact is SyncedNostrContact => contact != null)
          .sort(compareSyncedContacts)

        this.contactSource = {
          sourceType,
          sourceValue,
          resolvedPubkey: sourceUser.pubkey,
        }
        this.contacts = contacts
        this.contactSyncMeta = {
          lastSyncedAt: Date.now(),
          lastSyncError: null,
        }
        this.syncStatus = 'success'

        logger.nostr.info('Synced Nostr contacts', {
          sourceType,
          count: contacts.length,
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
      try {
        this.ndk = new NDK({
          explicitRelayUrls: this.relays,
        })

        // Setup connection promise before connecting
        const connectionPromise = new Promise<void>((resolve) => {
          this.ndk?.pool.on('relay:connect', () => resolve())
        })

        // Start connection
        this.ndk?.connect().catch(() => {
          // Connection errors are handled by the race condition below
        })

        // Wait for either timeout or connection
        await Promise.race([
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Connection timeout')), 10000)
          }),
          connectionPromise,
        ])

        logger.nostr.debug('NDK initialized', { relayUrls: this.ndk.explicitRelayUrls })

        // Give time for more relays to connect
        await new Promise((resolve) => {
          setTimeout(resolve, 1000)
        })
      } catch (error) {
        logger.error('Failed to initialize NDK', error)
      }
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

      const mintInfoFilter: NDKFilter = {
        kinds: [Nip87Kinds.FediInfo],
      } as unknown as NDKFilter
      const recommendationFilter: NDKFilter = {
        kinds: [Nip87Kinds.Recommendation],
        '#k': [String(Nip87Kinds.FediInfo)],
        limit: 500,
      } as unknown as NDKFilter

      if (this.lastDiscoveryCreatedAt > 0) {
        ;(mintInfoFilter as NDKFilter & { since?: number }).since = this.lastDiscoveryCreatedAt + 1
      }

      if (this.ndk != null) {
        this.federationSubscription = this.ndk.subscribe(mintInfoFilter, { closeOnEose: false })

        this.federationSubscription?.on('event', (event) => {
          try {
            this.handleFederationEvent(event)
          } catch (error) {
            if (isExpectedDiscoveryError(error)) {
              logger.nostr.warn('Skipping federation event due to expected discovery error', {
                eventId: event.id,
                reason: getErrorMessage(error),
              })
              return
            }
            logger.error('Failed to process federation event', error)
          }
        })

        this.recommendationSubscription = this.ndk.subscribe(recommendationFilter, {
          closeOnEose: false,
        })

        this.recommendationSubscription?.on('event', (event) => {
          try {
            this.handleRecommendationEvent(event)
          } catch (error) {
            logger.error('Failed to process federation recommendation', error)
          }
        })
      } else {
        this.isDiscoveringFederations = false
      }
    },

    handleFederationEvent(event: NDKEvent) {
      if (event.kind !== Nip87Kinds.FediInfo) return

      const candidate = extractFederationCandidate(event)
      if (candidate == null) {
        return
      }

      this.lastDiscoveryCreatedAt = Math.max(this.lastDiscoveryCreatedAt, candidate.createdAt)

      const existingIndex = this.discoveryCandidates.findIndex(
        (item) => item.federationId === candidate.federationId,
      )
      if (existingIndex >= 0) {
        const existing = this.discoveryCandidates[existingIndex]
        if (existing == null) {
          return
        }
        if (
          existing.inviteCode !== candidate.inviteCode ||
          existing.createdAt !== candidate.createdAt
        ) {
          const recommendationCount = this.getRecommendationCountForFederationId(
            candidate.federationId,
          )
          this.discoveryCandidates[existingIndex] = {
            ...candidate,
            recommendationCount: Math.max(existing.recommendationCount ?? 0, recommendationCount),
          }
          this.removeCachedPreview(candidate.federationId)
          delete this.previewAttemptedCreatedAt[candidate.federationId]
          delete this.previewStatusByFederation[candidate.federationId]
        }
      } else {
        this.discoveryCandidates.push({
          ...candidate,
          recommendationCount: this.getRecommendationCountForFederationId(candidate.federationId),
        })
        delete this.previewAttemptedCreatedAt[candidate.federationId]
        delete this.previewStatusByFederation[candidate.federationId]
      }

      this.sortDiscoveryCandidates()
      if (this.discoveryCandidates.length > MAX_DISCOVERY_CACHE_SIZE) {
        this.discoveryCandidates = this.discoveryCandidates.slice(0, MAX_DISCOVERY_CACHE_SIZE)
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
      this.lastRecommendationCreatedAt = Math.max(this.lastRecommendationCreatedAt, createdAt)

      let updated = false
      for (const federationId of recommendedFederationIds) {
        const votersByFederation = this.recommendationVotersByFederation[federationId] ?? {}
        const previousVoteCreatedAt = votersByFederation[event.pubkey]
        if (previousVoteCreatedAt != null && previousVoteCreatedAt >= createdAt) {
          continue
        }

        votersByFederation[event.pubkey] = createdAt
        this.recommendationVotersByFederation[federationId] = votersByFederation

        const recommendationCount = Object.keys(votersByFederation).length
        if (this.recommendationCountsByFederation[federationId] !== recommendationCount) {
          this.recommendationCountsByFederation[federationId] = recommendationCount
          updated = true
        }
      }

      if (!updated) {
        return
      }

      this.applyRecommendationCountsToCandidates()
      this.sortDiscoveryCandidates()
    },

    applyRecommendationCountsToCandidates() {
      this.discoveryCandidates = this.discoveryCandidates.map((candidate) => {
        const recommendationCount = this.getRecommendationCountForFederationId(
          candidate.federationId,
        )
        return {
          ...candidate,
          recommendationCount: Math.max(candidate.recommendationCount ?? 0, recommendationCount),
        }
      })
    },

    sortDiscoveryCandidates() {
      this.discoveryCandidates.sort((a, b) => {
        const recommendationDiff = (b.recommendationCount ?? 0) - (a.recommendationCount ?? 0)
        if (recommendationDiff !== 0) {
          return recommendationDiff
        }

        return b.createdAt - a.createdAt
      })
    },

    cacheFederationPreview(candidate: DiscoveredFederationCandidate, federation: Federation) {
      this.previewCacheByFederation = {
        ...this.previewCacheByFederation,
        [candidate.federationId]: {
          federation,
          candidateCreatedAt: candidate.createdAt,
          inviteCode: candidate.inviteCode,
          cachedAt: Date.now(),
          completeness: 'full',
        },
      }

      this.trimPreviewCache()
      this.syncDiscoveredFederationsFromCache()
    },

    removeCachedPreview(federationId: string) {
      if (!(federationId in this.previewCacheByFederation)) {
        this.discoveredFederations = this.discoveredFederations.filter(
          (federation) => federation.federationId !== federationId,
        )
        return
      }

      const { [federationId]: _removed, ...remaining } = this.previewCacheByFederation
      this.previewCacheByFederation = remaining
      this.discoveredFederations = this.discoveredFederations.filter(
        (federation) => federation.federationId !== federationId,
      )
    },

    trimPreviewCache() {
      const entries = Object.entries(this.previewCacheByFederation)
      if (entries.length <= MAX_DISCOVERY_CACHE_SIZE) {
        return
      }

      entries.sort(([, left], [, right]) => right.cachedAt - left.cachedAt)
      this.previewCacheByFederation = Object.fromEntries(entries.slice(0, MAX_DISCOVERY_CACHE_SIZE))
    },

    syncDiscoveredFederationsFromCache() {
      const validEntries = this.discoveryCandidates
        .map((candidate) => {
          const cached = this.previewCacheByFederation[candidate.federationId]
          if (!isCachedPreviewValid(cached, candidate)) {
            return undefined
          }

          return cached
        })
        .filter((cached): cached is CachedFederationPreview => cached != null)

      const remainingEntries = Object.entries(this.previewCacheByFederation)
        .filter(([federationId, cached]) => {
          const candidate = this.discoveryCandidates.find(
            (item) => item.federationId === federationId,
          )
          return candidate == null && !isPreviewCacheExpired(cached)
        })
        .map(([, cached]) => cached)

      const deduped = [...validEntries, ...remainingEntries]
      const seenIds = new Set<string>()
      this.discoveredFederations = deduped
        .filter((cached) => {
          const federationId = cached.federation.federationId
          if (seenIds.has(federationId)) {
            return false
          }
          seenIds.add(federationId)
          return true
        })
        .sort((left, right) => right.cachedAt - left.cachedAt)
        .map((cached) => cached.federation)
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
      if (this.federationSubscription != null) {
        this.federationSubscription.stop()
        this.federationSubscription = null
      }
      if (this.recommendationSubscription != null) {
        this.recommendationSubscription.stop()
        this.recommendationSubscription = null
      }
      this.previewQueue = []
      this.previewAttemptedCreatedAt = {}
      this.previewErrorLoggedCreatedAt = {}
      this.previewStatusByFederation = {}
      this.isDiscoveringFederations = false
    },
  },
})

function extractFederationCandidate(event: NDKEvent): DiscoveredFederationCandidate | null {
  logger.nostr.debug('Processing federation event', {
    eventId: event.id,
    createdAt: event.created_at,
  })

  const inviteTags = event.getMatchingTags('u')
  const inviteCode = inviteTags[0]?.[1]
  if (inviteCode == null || inviteCode === '') {
    return null
  }

  const fedTags = event.getMatchingTags('d')
  const federationId = fedTags[0]?.[1]
  if (federationId == null || federationId === '') {
    return null
  }

  const summary = extractCandidateSummary(event)

  return {
    federationId,
    inviteCode,
    createdAt: event.created_at ?? 0,
    ...(summary.displayName != null ? { displayName: summary.displayName } : {}),
    ...(summary.about != null ? { about: summary.about } : {}),
    ...(summary.pictureUrl != null ? { pictureUrl: summary.pictureUrl } : {}),
    ...(summary.network != null ? { network: summary.network } : {}),
  }
}

function extractRecommendationTargets(event: NDKEvent): string[] {
  const recommendedFederationIds = new Set<string>()

  for (const pointerTag of event.getMatchingTags('a')) {
    const pointer = pointerTag[1]
    if (pointer == null || pointer === '') {
      continue
    }

    const [kind, _pubkey, identifier] = pointer.split(':', 3)
    if (kind !== String(Nip87Kinds.FediInfo) || identifier == null || identifier === '') {
      continue
    }

    recommendedFederationIds.add(identifier)
  }

  const directFederationIds = event
    .getMatchingTags('d')
    .map((tag) => tag[1])
    .filter((federationId): federationId is string => federationId != null && federationId !== '')
  for (const federationId of directFederationIds) {
    recommendedFederationIds.add(federationId)
  }

  return [...recommendedFederationIds]
}

function isExpectedDiscoveryError(error: unknown): boolean {
  const message = getErrorMessage(error).trim()
  if (message === '') {
    return false
  }

  return EXPECTED_DISCOVERY_ERROR_PATTERNS.some((pattern) => pattern.test(message))
}

function extractCandidateSummary(
  event: NDKEvent,
): Pick<DiscoveredFederationCandidate, 'displayName' | 'about' | 'pictureUrl' | 'network'> {
  const content =
    typeof event.content === 'string' && event.content.trim() !== ''
      ? safeJsonParse(event.content)
      : undefined

  const networkTag = event
    .getMatchingTags('n')
    .map((tag) => tag[1])
    .find((value): value is string => typeof value === 'string' && value.trim() !== '')

  const displayName = getStringValue(content, ['name', 'federation_name'])
  const about = getStringValue(content, ['about', 'description'])
  const pictureUrl = getStringValue(content, [
    'picture',
    'image',
    'icon',
    'icon_url',
    'picture_url',
    'federation_icon_url',
  ])
  const network = networkTag ?? getStringValue(content, ['network'])

  return {
    ...(displayName != null ? { displayName } : {}),
    ...(about != null ? { about } : {}),
    ...(pictureUrl != null ? { pictureUrl } : {}),
    ...(network != null ? { network } : {}),
  }
}

function safeJsonParse(value: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(value) as unknown
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : undefined
  } catch {
    return undefined
  }
}

function getStringValue(
  content: Record<string, unknown> | undefined,
  keys: string[],
): string | undefined {
  if (content == null) {
    return undefined
  }

  for (const key of keys) {
    const value = content[key]
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim()
    }
  }

  return undefined
}

function isPreviewCacheExpired(cached: CachedFederationPreview): boolean {
  return Date.now() - cached.cachedAt > PREVIEW_CACHE_MAX_AGE_MS
}

function isCachedPreviewValid(
  cached: CachedFederationPreview | undefined,
  candidate: DiscoveredFederationCandidate,
): cached is CachedFederationPreview {
  if (cached == null) {
    return false
  }

  if (cached.completeness !== 'full') {
    return false
  }

  if (isPreviewCacheExpired(cached)) {
    return false
  }

  return (
    cached.federation.federationId === candidate.federationId &&
    cached.inviteCode === candidate.inviteCode &&
    cached.candidateCreatedAt === candidate.createdAt
  )
}

function doesPreviewMatchCandidate(
  candidate: DiscoveredFederationCandidate,
  federation: Federation,
): boolean {
  return federation.federationId === candidate.federationId
}

function isValidContactSource(sourceType: NostrContactSourceType, sourceValue: string): boolean {
  if (sourceType === 'nip05') {
    return isValidNip05(sourceValue)
  }

  try {
    const decoded = nip19.decode(sourceValue)
    return decoded.type === 'npub'
  } catch {
    return false
  }
}

function inferContactSourceType(sourceValue: string): NostrContactSourceType {
  try {
    const decoded = nip19.decode(sourceValue)
    if (decoded.type === 'npub') {
      return 'npub'
    }
  } catch {
    // Fall through to NIP-05 validation for non-npub identifiers.
  }

  return 'nip05'
}

function getInvalidContactSourceMessage(): string {
  return 'Enter a valid NIP-05 identifier like user@domain.com or a valid npub identifier.'
}

function getLatestProfileEvents(profileEvents: Set<NDKEvent>): Map<string, NDKEvent> {
  const latestEvents = new Map<string, NDKEvent>()

  for (const event of profileEvents) {
    if (event.pubkey == null || event.pubkey === '') {
      continue
    }

    const existingEvent = latestEvents.get(event.pubkey)
    if (existingEvent == null || (event.created_at ?? 0) > (existingEvent.created_at ?? 0)) {
      latestEvents.set(event.pubkey, event)
    }
  }

  return latestEvents
}

function mapProfileEventToContact(
  pubkey: string,
  profileEvent: NDKEvent,
): SyncedNostrContact | null {
  try {
    const profile = profileFromEvent(profileEvent)
    const displayName = normalizeOptionalString(profile.displayName)
    const name = normalizeOptionalString(profile.name)
    const nip05 = normalizeOptionalString(profile.nip05)
    const picture = normalizeOptionalString(profile.picture)
    const lud16 = normalizeOptionalString(profile.lud16)
    const lud06 = normalizeOptionalString(profile.lud06)
    const paymentTarget = lud16 ?? lud06

    if (paymentTarget == null) {
      return null
    }

    return {
      pubkey,
      npub: nip19.npubEncode(pubkey),
      ...(displayName != null ? { displayName } : {}),
      ...(name != null ? { name } : {}),
      ...(nip05 != null ? { nip05 } : {}),
      ...(picture != null ? { picture } : {}),
      ...(lud16 != null ? { lud16 } : {}),
      ...(lud06 != null ? { lud06 } : {}),
      paymentTarget,
    }
  } catch (error) {
    logger.nostr.warn('Skipping invalid Nostr profile while syncing contacts', {
      pubkey,
      reason: getErrorMessage(error),
    })
    return null
  }
}

function compareSyncedContacts(left: SyncedNostrContact, right: SyncedNostrContact): number {
  const leftLabel = getComparableContactLabel(left)
  const rightLabel = getComparableContactLabel(right)

  if (leftLabel === rightLabel) {
    return left.npub.localeCompare(right.npub)
  }

  return leftLabel.localeCompare(rightLabel)
}

function getComparableContactLabel(contact: SyncedNostrContact): string {
  return normalizeContactSearchValue(
    contact.displayName ?? contact.name ?? contact.nip05 ?? contact.npub,
  )
}

function getContactSearchValues(contact: SyncedNostrContact): string[] {
  return [
    contact.displayName,
    contact.name,
    contact.nip05,
    contact.npub,
    contact.lud16,
    contact.paymentTarget,
  ]
    .map((value) => normalizeContactSearchValue(value))
    .filter((value) => value !== '')
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function normalizeContactSearchValue(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLocaleLowerCase() : ''
}
