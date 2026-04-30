import NDK, { type NDKEvent, type NDKFilter } from '@nostr-dev-kit/ndk'
import { logger } from 'src/services/logger'
import { Nip87Kinds } from 'src/types/nip87'
import { getErrorMessage } from 'src/utils/error'
import { isExpectedDiscoveryError } from 'src/services/nostr/discovery'

const NDK_CONNECT_TIMEOUT_MS = 10_000
const NDK_RELAY_SETTLE_MS = 1_000

export type NostrDiscoverySubscriptions = {
  federationSubscription: NostrEventSubscription
  recommendationSubscription: NostrEventSubscription
}

type StoppableDiscoverySubscriptions = {
  federationSubscription?: NostrEventSubscription | null
  recommendationSubscription?: NostrEventSubscription | null
}

export type NostrFetchedUser = {
  pubkey: string
  followSet: () => Promise<Set<string>>
}

export type NostrEventSubscription = {
  on: (eventName: 'event', handler: (event: NDKEvent) => void) => unknown
  stop: () => void
}

export type NostrNdkClient = {
  explicitRelayUrls?: string[]
  pool: {
    on: (eventName: 'relay:connect', handler: () => void) => unknown
  }
  connect: () => Promise<void>
  subscribe: (filter: NDKFilter, options: { closeOnEose: boolean }) => NostrEventSubscription
  fetchUser: (sourceValue: string) => Promise<NostrFetchedUser | null | undefined>
  fetchEvents: (filter: NDKFilter) => Promise<Set<NDKEvent>>
}

type CreateNdk = (relayUrls: string[]) => NostrNdkClient

type InitializeNdkOptions = {
  createNdk?: CreateNdk
  connectTimeoutMs?: number
  relaySettleMs?: number
}

type DiscoverySubscriptionHandlers = {
  onFederationEvent: (event: NDKEvent) => void
  onRecommendationEvent: (event: NDKEvent) => void
}

export async function initializeNdk(
  relayUrls: string[],
  {
    createNdk = (explicitRelayUrls) => new NDK({ explicitRelayUrls }),
    connectTimeoutMs = NDK_CONNECT_TIMEOUT_MS,
    relaySettleMs = NDK_RELAY_SETTLE_MS,
  }: InitializeNdkOptions = {},
): Promise<NostrNdkClient> {
  const ndk = createNdk(relayUrls)

  try {
    const connectionPromise = waitForRelayConnection(ndk)
    ndk.connect().catch(() => {
      // Connection errors are handled by the timeout race below.
    })

    await Promise.race([rejectAfter(connectTimeoutMs, 'Connection timeout'), connectionPromise])

    logger.nostr.debug('NDK initialized', { relayUrls: ndk.explicitRelayUrls })
    await sleep(relaySettleMs)
  } catch (error) {
    logger.error('Failed to initialize NDK', error)
  }

  return ndk
}

export function subscribeToFederationDiscovery(
  ndk: NostrNdkClient,
  lastDiscoveryCreatedAt: number,
  handlers: DiscoverySubscriptionHandlers,
): NostrDiscoverySubscriptions {
  const federationSubscription = ndk.subscribe(
    createFederationDiscoveryFilter(lastDiscoveryCreatedAt),
    {
      closeOnEose: false,
    },
  )
  federationSubscription.on('event', (event) => {
    try {
      handlers.onFederationEvent(event)
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

  const recommendationSubscription = ndk.subscribe(createRecommendationDiscoveryFilter(), {
    closeOnEose: false,
  })
  recommendationSubscription.on('event', (event) => {
    try {
      handlers.onRecommendationEvent(event)
    } catch (error) {
      logger.error('Failed to process federation recommendation', error)
    }
  })

  return {
    federationSubscription,
    recommendationSubscription,
  }
}

export function stopDiscoverySubscriptions(subscriptions: StoppableDiscoverySubscriptions): void {
  subscriptions.federationSubscription?.stop()
  subscriptions.recommendationSubscription?.stop()
}

export function createFederationDiscoveryFilter(lastDiscoveryCreatedAt: number): NDKFilter {
  const filter: NDKFilter = {
    kinds: [Nip87Kinds.FediInfo],
  } as unknown as NDKFilter

  if (lastDiscoveryCreatedAt > 0) {
    ;(filter as NDKFilter & { since?: number }).since = lastDiscoveryCreatedAt + 1
  }

  return filter
}

export function createRecommendationDiscoveryFilter(): NDKFilter {
  return {
    kinds: [Nip87Kinds.Recommendation],
    '#k': [String(Nip87Kinds.FediInfo)],
    limit: 500,
  } as unknown as NDKFilter
}

function waitForRelayConnection(ndk: NostrNdkClient): Promise<void> {
  return new Promise((resolve) => {
    ndk.pool.on('relay:connect', () => resolve())
  })
}

function rejectAfter(timeoutMs: number, message: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), timeoutMs)
  })
}

function sleep(timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, timeoutMs)
  })
}
