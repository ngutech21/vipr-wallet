import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NDKEvent, NDKFilter, NDKSubscription } from '@nostr-dev-kit/ndk'
import { Nip87Kinds } from 'src/types/nip87'
import {
  createFederationDiscoveryFilter,
  createRecommendationDiscoveryFilter,
  initializeNdk,
  stopDiscoverySubscriptions,
  subscribeToFederationDiscovery,
} from 'src/services/nostr/subscriptions'

type RelayConnectHandler = () => void

class MockSubscription {
  readonly on = vi.fn((eventName: string, handler: (event: NDKEvent) => void) => {
    if (eventName === 'event') {
      this.eventHandler = handler
    }
    return this
  })

  readonly stop = vi.fn()
  private eventHandler: ((event: NDKEvent) => void) | undefined

  emit(event: NDKEvent) {
    this.eventHandler?.(event)
  }
}

type MockNdk = {
  explicitRelayUrls: string[]
  pool: {
    on: ReturnType<typeof vi.fn<(eventName: string, handler: RelayConnectHandler) => void>>
  }
  connect: ReturnType<typeof vi.fn<() => Promise<void>>>
  subscribe: ReturnType<
    typeof vi.fn<(filter: NDKFilter, options: { closeOnEose: boolean }) => NDKSubscription>
  >
}

function createNdk(relayUrls: string[], connectOnConnect = true): MockNdk {
  let relayConnectHandler: RelayConnectHandler | undefined

  return {
    explicitRelayUrls: relayUrls,
    pool: {
      on: vi.fn((eventName: string, handler: RelayConnectHandler) => {
        if (eventName === 'relay:connect') {
          relayConnectHandler = handler
        }
      }),
    },
    connect: vi.fn(() => {
      if (connectOnConnect) {
        relayConnectHandler?.()
      }
      return Promise.resolve()
    }),
    subscribe: vi.fn(),
  }
}

function createEvent(overrides: Partial<NDKEvent> = {}): NDKEvent {
  return {
    id: 'event-1',
    kind: Nip87Kinds.FediInfo,
    created_at: 1,
    ...overrides,
  } as NDKEvent
}

describe('nostr subscription service', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('initializes NDK and keeps the instance after a relay connection', async () => {
    vi.useFakeTimers()
    const ndk = createNdk(['wss://relay.example'])

    const initialized = initializeNdk(['wss://relay.example'], {
      createNdk: () => ndk as unknown as Awaited<ReturnType<typeof initializeNdk>>,
      connectTimeoutMs: 100,
      relaySettleMs: 5,
    })

    await vi.runAllTimersAsync()

    await expect(initialized).resolves.toBe(ndk)
    expect(ndk.pool.on).toHaveBeenCalledWith('relay:connect', expect.any(Function))
    expect(ndk.connect).toHaveBeenCalledOnce()
  })

  it('returns the NDK instance even when relay connection times out', async () => {
    vi.useFakeTimers()
    const ndk = createNdk(['wss://relay.example'], false)

    const initialized = initializeNdk(['wss://relay.example'], {
      createNdk: () => ndk as unknown as Awaited<ReturnType<typeof initializeNdk>>,
      connectTimeoutMs: 100,
      relaySettleMs: 5,
    })

    await vi.advanceTimersByTimeAsync(100)

    await expect(initialized).resolves.toBe(ndk)
    expect(ndk.connect).toHaveBeenCalledOnce()
  })

  it('creates stable discovery filters', () => {
    expect(createFederationDiscoveryFilter(0)).toEqual({
      kinds: [Nip87Kinds.FediInfo],
    })
    expect(createFederationDiscoveryFilter(41)).toEqual({
      kinds: [Nip87Kinds.FediInfo],
      since: 42,
    })
    expect(createRecommendationDiscoveryFilter()).toEqual({
      kinds: [Nip87Kinds.Recommendation],
      '#k': [String(Nip87Kinds.FediInfo)],
      limit: 500,
    })
  })

  it('subscribes to federation and recommendation events', () => {
    const federationSubscription = new MockSubscription()
    const recommendationSubscription = new MockSubscription()
    const ndk = createNdk(['wss://relay.example'])
    ndk.subscribe
      .mockReturnValueOnce(federationSubscription as unknown as NDKSubscription)
      .mockReturnValueOnce(recommendationSubscription as unknown as NDKSubscription)
    const onFederationEvent = vi.fn()
    const onRecommendationEvent = vi.fn()

    const subscriptions = subscribeToFederationDiscovery(ndk as unknown as never, 10, {
      onFederationEvent,
      onRecommendationEvent,
    })

    expect(subscriptions).toEqual({
      federationSubscription,
      recommendationSubscription,
    })
    expect(ndk.subscribe).toHaveBeenNthCalledWith(
      1,
      { kinds: [Nip87Kinds.FediInfo], since: 11 },
      { closeOnEose: false },
    )
    expect(ndk.subscribe).toHaveBeenNthCalledWith(
      2,
      { kinds: [Nip87Kinds.Recommendation], '#k': [String(Nip87Kinds.FediInfo)], limit: 500 },
      { closeOnEose: false },
    )

    const federationEvent = createEvent({ id: 'federation-event' })
    const recommendationEvent = createEvent({
      id: 'recommendation-event',
      kind: Nip87Kinds.Recommendation,
    })
    federationSubscription.emit(federationEvent)
    recommendationSubscription.emit(recommendationEvent)

    expect(onFederationEvent).toHaveBeenCalledWith(federationEvent)
    expect(onRecommendationEvent).toHaveBeenCalledWith(recommendationEvent)
  })

  it('keeps subscription event errors contained', () => {
    const federationSubscription = new MockSubscription()
    const recommendationSubscription = new MockSubscription()
    const ndk = createNdk(['wss://relay.example'])
    ndk.subscribe
      .mockReturnValueOnce(federationSubscription as unknown as NDKSubscription)
      .mockReturnValueOnce(recommendationSubscription as unknown as NDKSubscription)

    subscribeToFederationDiscovery(ndk as unknown as never, 0, {
      onFederationEvent: () => {
        throw new Error('Failed to fetch')
      },
      onRecommendationEvent: () => {
        throw new Error('Unexpected recommendation error')
      },
    })

    expect(() => federationSubscription.emit(createEvent())).not.toThrow()
    expect(() =>
      recommendationSubscription.emit(createEvent({ kind: Nip87Kinds.Recommendation })),
    ).not.toThrow()
  })

  it('stops both discovery subscriptions', () => {
    const federationSubscription = new MockSubscription()
    const recommendationSubscription = new MockSubscription()

    stopDiscoverySubscriptions({
      federationSubscription,
      recommendationSubscription,
    })

    expect(federationSubscription.stop).toHaveBeenCalledOnce()
    expect(recommendationSubscription.stop).toHaveBeenCalledOnce()
  })
})
