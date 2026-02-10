import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import NDK, { type NDKEvent, type NDKFilter, type NDKSubscription } from '@nostr-dev-kit/ndk'
import type { Federation } from 'src/components/models'
import { Nip87Kinds } from 'src/types/nip87'
import { useWalletStore } from './wallet'
import { logger } from 'src/services/logger'

type DiscoveredFederationCandidate = {
  federationId: string
  inviteCode: string
  createdAt: number
}

const DEFAULT_RELAYS = [
  'wss://nostr.mutinywallet.com/',
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://relay.snort.social',
  'wss://relay.primal.net',
]

const DISCOVERY_PAGE_SIZE = 5
const MAX_DISCOVERY_CACHE_SIZE = 50
const PREVIEW_TIMEOUT_MS = 7_000
const PREVIEW_QUEUE_IDLE_POLL_MS = 50
const PREVIEW_TIMEOUT_TOKEN = Symbol('preview-timeout')
const EXPECTED_DISCOVERY_ERROR_PATTERNS = [
  /failed to download client config/i,
  /failed to fetch/i,
  /networkerror/i,
  /load failed/i,
  /connection timeout/i,
]

export const useNostrStore = defineStore('nostr', {
  state: () => ({
    relays: useLocalStorage<string[]>('vipr.nostr.relays', DEFAULT_RELAYS),
    pubkey: useLocalStorage<string>('vipr.nostr.pubkey', ''),
    ndk: null as NDK | null,
    discoveredFederations: useLocalStorage<Federation[]>('vipr.nostr.discovery.federations', []),
    discoveryCandidates: useLocalStorage<DiscoveredFederationCandidate[]>(
      'vipr.nostr.discovery.candidates',
      [],
    ),
    lastDiscoveryCreatedAt: useLocalStorage<number>('vipr.nostr.discovery.last-created-at', 0),
    isDiscoveringFederations: false,
    federationSubscription: null as NDKSubscription | null,
    previewTargetCount: DISCOVERY_PAGE_SIZE,
    previewQueue: [] as string[],
    isPreviewQueueRunning: false,
    isJoinInProgress: false,
    previewAttemptedCreatedAt: {} as Record<string, number>,
    previewErrorLoggedCreatedAt: {} as Record<string, number>,
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

    setJoinInProgress(isInProgress: boolean) {
      this.isJoinInProgress = isInProgress
      if (!isInProgress) {
        this.processPreviewQueue().catch((error) => {
          logger.error('Failed to process preview queue after join', error)
        })
      }
    },

    setPreviewTargetCount(count: number) {
      this.previewTargetCount = Math.max(DISCOVERY_PAGE_SIZE, count)
      this.enqueueCandidatesForPreview()
      this.processPreviewQueue().catch((error) => {
        logger.error('Failed to process preview queue after target update', error)
      })
    },

    increasePreviewTarget(count = DISCOVERY_PAGE_SIZE) {
      this.setPreviewTargetCount(this.previewTargetCount + count)
    },

    resetPreviewTargetCount() {
      this.setPreviewTargetCount(DISCOVERY_PAGE_SIZE)
    },

    clearDiscoveryCache() {
      this.discoveredFederations = []
      this.discoveryCandidates = []
      this.previewQueue = []
      this.previewAttemptedCreatedAt = {}
      this.previewErrorLoggedCreatedAt = {}
      this.lastDiscoveryCreatedAt = 0
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
      this.resetPreviewTargetCount()

      const mintInfoFilter: NDKFilter = {
        kinds: [Nip87Kinds.FediInfo],
      } as unknown as NDKFilter

      if (this.lastDiscoveryCreatedAt > 0) {
        ;(mintInfoFilter as NDKFilter & { since?: number }).since = this.lastDiscoveryCreatedAt + 1
      }

      this.enqueueCandidatesForPreview()
      this.processPreviewQueue().catch((error) => {
        logger.error('Failed to process preview queue while discovering federations', error)
      })

      if (this.ndk != null) {
        this.federationSubscription = this.ndk.subscribe(mintInfoFilter, { closeOnEose: false })

        this.federationSubscription?.on('event', (event) => {
          this.handleFederationEvent(event).catch((error) => {
            if (isExpectedDiscoveryError(error)) {
              logger.nostr.warn('Skipping federation event due to expected discovery error', {
                eventId: event.id,
                reason: getErrorMessage(error),
              })
              return
            }
            logger.error('Failed to process federation event', error)
          })
        })
      } else {
        this.isDiscoveringFederations = false
      }
    },

    async handleFederationEvent(event: NDKEvent) {
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
          this.discoveryCandidates[existingIndex] = candidate
          delete this.previewAttemptedCreatedAt[candidate.federationId]
        }
      } else {
        this.discoveryCandidates.push(candidate)
        delete this.previewAttemptedCreatedAt[candidate.federationId]
      }

      this.discoveryCandidates.sort((a, b) => b.createdAt - a.createdAt)
      if (this.discoveryCandidates.length > MAX_DISCOVERY_CACHE_SIZE) {
        this.discoveryCandidates = this.discoveryCandidates.slice(0, MAX_DISCOVERY_CACHE_SIZE)
      }

      this.enqueueCandidatesForPreview()
      await this.processPreviewQueue()
    },

    enqueueCandidatesForPreview() {
      const discoveredIds = new Set(this.discoveredFederations.map((f) => f.federationId))
      const validCandidateIds = new Set(
        this.discoveryCandidates.map((candidate) => candidate.federationId),
      )
      this.previewQueue = this.previewQueue.filter(
        (federationId) => validCandidateIds.has(federationId) && !discoveredIds.has(federationId),
      )

      const queuedIds = new Set(this.previewQueue)
      const missingPreviews = Math.max(
        0,
        this.previewTargetCount - this.discoveredFederations.length - this.previewQueue.length,
      )
      if (missingPreviews === 0) {
        return
      }

      let queuedCount = 0
      for (const candidate of this.discoveryCandidates) {
        if (queuedCount >= missingPreviews) {
          break
        }

        if (discoveredIds.has(candidate.federationId) || queuedIds.has(candidate.federationId)) {
          continue
        }
        const attemptedCreatedAt = this.previewAttemptedCreatedAt[candidate.federationId]
        if (attemptedCreatedAt != null && attemptedCreatedAt >= candidate.createdAt) {
          continue
        }

        this.previewQueue.push(candidate.federationId)
        queuedIds.add(candidate.federationId)
        queuedCount += 1
      }
    },

    async processPreviewQueue() {
      if (this.isPreviewQueueRunning || this.isJoinInProgress || !this.isDiscoveringFederations) {
        return
      }

      this.isPreviewQueueRunning = true
      const walletStore = useWalletStore()

      try {
        walletStore.initDirector()

        while (
          this.discoveredFederations.length < this.previewTargetCount &&
          !this.isJoinInProgress &&
          this.isDiscoveringFederations
        ) {
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

          if (this.discoveredFederations.some((f) => f.federationId === federationId)) {
            continue
          }

          const candidate = this.discoveryCandidates.find(
            (item) => item.federationId === federationId,
          )
          if (candidate == null) {
            continue
          }

          this.previewAttemptedCreatedAt[candidate.federationId] = candidate.createdAt

          const previewPromise = walletStore
            .previewFederation(candidate.inviteCode)
            .catch((error) => {
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
          const previewResult = await raceWithTimeout(previewPromise, PREVIEW_TIMEOUT_MS)
          if (previewResult === PREVIEW_TIMEOUT_TOKEN) {
            logger.warn('Federation preview timed out', { federationId: candidate.federationId })
            continue
          }

          const federation = previewResult
          if (federation == null) {
            continue
          }

          if (!this.discoveredFederations.some((f) => f.federationId === federation.federationId)) {
            this.discoveredFederations.push(federation)
            this.discoveredFederations.sort((a, b) => {
              return (a.title ?? '').localeCompare(b.title ?? '')
            })

            if (this.discoveredFederations.length > MAX_DISCOVERY_CACHE_SIZE) {
              this.discoveredFederations = this.discoveredFederations.slice(
                0,
                MAX_DISCOVERY_CACHE_SIZE,
              )
            }
          }
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
      this.previewQueue = []
      this.previewAttemptedCreatedAt = {}
      this.previewErrorLoggedCreatedAt = {}
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

  return {
    federationId,
    inviteCode,
    createdAt: event.created_at ?? 0,
  }
}

async function raceWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T | typeof PREVIEW_TIMEOUT_TOKEN> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<typeof PREVIEW_TIMEOUT_TOKEN>((resolve) => {
    timeoutId = setTimeout(() => resolve(PREVIEW_TIMEOUT_TOKEN), timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId != null) {
      clearTimeout(timeoutId)
    }
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  if (typeof error === 'object' && error !== null) {
    const details = error as { message?: unknown; error?: unknown }
    if (typeof details.message === 'string' && details.message !== '') {
      return details.message
    }
    if (typeof details.error === 'string' && details.error !== '') {
      return details.error
    }
  }

  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

function isExpectedDiscoveryError(error: unknown): boolean {
  const message = getErrorMessage(error).trim()
  if (message === '') {
    return false
  }

  return EXPECTED_DISCOVERY_ERROR_PATTERNS.some((pattern) => pattern.test(message))
}
