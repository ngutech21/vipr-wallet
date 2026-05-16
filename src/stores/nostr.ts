import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import type { NDKEvent } from '@nostr-dev-kit/ndk'
import type {
  NostrContactSource,
  NostrContactSyncMeta,
  NostrContactSyncStatus,
  SyncedNostrContact,
} from 'src/types/nostr'
import { Nip87Kinds } from 'src/types/nip87'
import { logger } from 'src/services/logger'
import { getErrorMessage } from 'src/utils/error'
import {
  applyFederationCandidateToDiscoveryState,
  applyRecommendationTargetsToDiscoveryState,
  extractFederationCandidate,
  extractRecommendationTargets,
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
  initializeNdk,
  stopDiscoverySubscriptions,
  subscribeToFederationDiscovery,
  type NostrEventSubscription,
  type NostrNdkClient,
} from 'src/services/nostr/subscriptions'

function createInitialNostrSyncStatus(): NostrContactSyncStatus {
  return 'idle'
}

function createRecommendationVotersByFederation(): Record<string, Record<string, number>> {
  return {}
}

export type NostrContactSyncResult =
  | {
      type: 'success'
      contactCount: number
    }
  | {
      type: 'error'
      message: string
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
    discoveryVisibleCount: DISCOVERY_PAGE_SIZE,
    isJoinInProgress: false,
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

    async syncContacts(): Promise<NostrContactSyncResult> {
      const sourceValue = this.contactSource.sourceValue.trim()
      if (sourceValue === '') {
        const message = 'Enter a Nostr identifier before syncing contacts.'
        this.syncStatus = 'error'
        this.contactSyncMeta = {
          ...this.contactSyncMeta,
          lastSyncError: message,
        }
        return {
          type: 'error',
          message,
        }
      }

      const sourceType = inferContactSourceType(sourceValue)

      if (!isValidContactSource(sourceType, sourceValue)) {
        const message = getInvalidContactSourceMessage()
        this.syncStatus = 'error'
        this.contactSyncMeta = {
          ...this.contactSyncMeta,
          lastSyncError: message,
        }
        return {
          type: 'error',
          message,
        }
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

        return {
          type: 'success',
          contactCount: result.contacts.length,
        }
      } catch (error) {
        const errorMessage = getErrorMessage(error)
        this.contactSyncMeta = {
          ...this.contactSyncMeta,
          lastSyncError: errorMessage,
        }
        this.syncStatus = 'error'
        logger.error('Failed to sync Nostr contacts', error)
        return {
          type: 'error',
          message: errorMessage,
        }
      }
    },

    getRecommendationCountForFederationId(federationId: string): number {
      return this.recommendationCountsByFederation[federationId] ?? 0
    },

    setJoinInProgress(isInProgress: boolean) {
      this.isJoinInProgress = isInProgress
    },

    setDiscoveryVisibleCount(count: number) {
      this.discoveryVisibleCount = Math.max(DISCOVERY_PAGE_SIZE, count)
    },

    increaseDiscoveryVisibleCount(count = DISCOVERY_PAGE_SIZE) {
      this.setDiscoveryVisibleCount(this.discoveryVisibleCount + count)
    },

    resetDiscoveryVisibleCount() {
      this.setDiscoveryVisibleCount(DISCOVERY_PAGE_SIZE)
    },

    clearDiscoveryCache() {
      this.discoveryCandidates = []
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
      this.resetDiscoveryVisibleCount()

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
        logger.nostr.debug('Federation discovery candidate updated', {
          federationId: update.invalidatedFederationId,
        })
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

    stopDiscoveringFederations() {
      logger.nostr.debug('Stopping federation discovery')
      stopDiscoverySubscriptions({
        federationSubscription: this.federationSubscription,
        recommendationSubscription: this.recommendationSubscription,
      })
      this.federationSubscription = null
      this.recommendationSubscription = null
      this.isDiscoveringFederations = false
    },
  },
})
