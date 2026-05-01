import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Federation } from 'src/types/federation'
import { nip19, type NDKEvent } from '@nostr-dev-kit/ndk'
import { Nip87Kinds } from 'src/types/nip87'
import { logger } from 'src/services/logger'

const walletStoreMock = vi.hoisted(() => ({
  initClients: vi.fn<() => Promise<void>>(),
  previewFederation: vi.fn<() => Promise<Federation | undefined>>(),
}))

vi.mock('src/stores/wallet', () => ({
  useWalletStore: () => walletStoreMock,
}))

import { useNostrStore } from 'src/stores/nostr'

function createFederation(id: string, inviteCode: string, title: string): Federation {
  return {
    federationId: id,
    inviteCode,
    title,
    modules: [],
    metadata: {},
  }
}

function setCachedPreview(
  nostr: ReturnType<typeof useNostrStore>,
  federation: Federation,
  createdAt: number,
) {
  nostr.previewCacheByFederation = {
    ...nostr.previewCacheByFederation,
    [federation.federationId]: {
      federation,
      candidateCreatedAt: createdAt,
      inviteCode: federation.inviteCode,
      cachedAt: Date.now(),
      completeness: 'full',
    },
  }
}

function createFederationEvent({
  federationId,
  inviteCode,
  createdAt,
}: {
  federationId: string
  inviteCode: string
  createdAt: number
}): NDKEvent {
  return {
    id: `${federationId}-${createdAt}`,
    kind: Nip87Kinds.FediInfo,
    created_at: createdAt,
    getMatchingTags(tag: string) {
      if (tag === 'u') {
        return [['u', inviteCode]]
      }
      if (tag === 'd') {
        return [['d', federationId]]
      }
      return []
    },
  } as unknown as NDKEvent
}

function createRecommendationEvent({
  pubkey,
  createdAt,
  federationIds = [],
  inviteCodes = [],
}: {
  pubkey: string
  createdAt: number
  federationIds?: string[]
  inviteCodes?: string[]
}): NDKEvent {
  return {
    id: `recommendation-${pubkey}-${createdAt}`,
    kind: Nip87Kinds.Recommendation,
    pubkey,
    created_at: createdAt,
    getMatchingTags(tag: string) {
      if (tag === 'a') {
        return federationIds.map((federationId) => [
          'a',
          `${Nip87Kinds.FediInfo}:${pubkey}:${federationId}`,
        ])
      }
      if (tag === 'u') {
        return inviteCodes.map((inviteCode) => ['u', inviteCode])
      }
      return []
    },
  } as unknown as NDKEvent
}

function createProfileEvent(
  pubkey: string,
  createdAt: number,
  profile: Record<string, unknown>,
): NDKEvent {
  const id = `profile-${pubkey}-${createdAt}`
  const content = JSON.stringify(profile)

  return {
    id,
    kind: 0,
    pubkey,
    created_at: createdAt,
    content,
    rawEvent() {
      return {
        id,
        kind: 0,
        pubkey,
        created_at: createdAt,
        content,
        tags: [],
        sig: '',
      }
    },
  } as unknown as NDKEvent
}

const SOURCE_PUBKEY = '1'.repeat(64)
const SOURCE_NPUB = nip19.npubEncode(SOURCE_PUBKEY)
const PAYABLE_LUD16_PUBKEY = '2'.repeat(64)
const PAYABLE_LUD06_PUBKEY = '3'.repeat(64)
const NON_PAYABLE_PUBKEY = '4'.repeat(64)

describe('nostr store discovery queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    localStorage.clear()
    walletStoreMock.initClients.mockReset()
    walletStoreMock.initClients.mockResolvedValue()
    walletStoreMock.previewFederation.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('continues scanning candidates when early previews fail', async () => {
    const nostr = useNostrStore()
    nostr.isDiscoveringFederations = true
    nostr.previewTargetCount = 2
    nostr.discoveryCandidates = [
      { federationId: 'fed-1', inviteCode: 'invite-1', createdAt: 30 },
      { federationId: 'fed-2', inviteCode: 'invite-2', createdAt: 20 },
      { federationId: 'fed-3', inviteCode: 'invite-3', createdAt: 10 },
    ]

    walletStoreMock.previewFederation
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(createFederation('fed-2', 'invite-2', 'Second'))
      .mockResolvedValueOnce(createFederation('fed-3', 'invite-3', 'Third'))

    nostr.enqueueCandidatesForPreview()
    await nostr.processPreviewQueue()

    expect(walletStoreMock.previewFederation).toHaveBeenCalledTimes(3)
    expect(walletStoreMock.previewFederation).toHaveBeenNthCalledWith(1, 'invite-1')
    expect(walletStoreMock.previewFederation).toHaveBeenNthCalledWith(2, 'invite-2')
    expect(walletStoreMock.previewFederation).toHaveBeenNthCalledWith(3, 'invite-3')
    expect(nostr.discoveredFederations).toHaveLength(2)
    expect(nostr.discoveredFederations.map((f) => f.federationId).sort()).toEqual([
      'fed-2',
      'fed-3',
    ])
  })

  it('does not retry unchanged candidates that already failed preview', async () => {
    const nostr = useNostrStore()
    nostr.isDiscoveringFederations = true
    nostr.previewTargetCount = 1
    nostr.discoveryCandidates = [{ federationId: 'fed-1', inviteCode: 'invite-1', createdAt: 30 }]
    walletStoreMock.previewFederation.mockResolvedValue(undefined)

    nostr.enqueueCandidatesForPreview()
    await nostr.processPreviewQueue()

    nostr.enqueueCandidatesForPreview()

    expect(walletStoreMock.previewFederation).toHaveBeenCalledTimes(1)
    expect(nostr.previewQueue).toEqual([])
  })

  it('retries a candidate only after the queue is manually resumed for a newer federation event', async () => {
    const nostr = useNostrStore()
    nostr.isDiscoveringFederations = true
    nostr.previewTargetCount = 1
    nostr.discoveryCandidates = [{ federationId: 'fed-1', inviteCode: 'invite-1', createdAt: 30 }]

    walletStoreMock.previewFederation
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(createFederation('fed-1', 'invite-1-updated', 'Updated'))

    nostr.enqueueCandidatesForPreview()
    await nostr.processPreviewQueue()

    nostr.handleFederationEvent(
      createFederationEvent({
        federationId: 'fed-1',
        inviteCode: 'invite-1-updated',
        createdAt: 31,
      }),
    )

    expect(walletStoreMock.previewFederation).toHaveBeenCalledTimes(1)

    nostr.enqueueCandidatesForPreview()
    await nostr.processPreviewQueue()

    expect(walletStoreMock.previewFederation).toHaveBeenCalledTimes(2)
    expect(nostr.discoveredFederations).toHaveLength(1)
    expect(nostr.discoveredFederations[0]?.federationId).toBe('fed-1')
    expect(nostr.discoveredFederations[0]?.inviteCode).toBe('invite-1-updated')
  })

  it('does not start background previews when discovery starts', async () => {
    const nostr = useNostrStore()
    nostr.ndk = {
      subscribe: vi.fn().mockReturnValue({
        on: vi.fn(),
        stop: vi.fn(),
      }),
    } as unknown as NonNullable<typeof nostr.ndk>

    await nostr.discoverFederations()

    expect(walletStoreMock.initClients).not.toHaveBeenCalled()
    expect(walletStoreMock.previewFederation).not.toHaveBeenCalled()
    expect(nostr.previewQueue).toEqual([])
  })

  it('uses cached previews without calling previewFederation again', async () => {
    const nostr = useNostrStore()
    nostr.isDiscoveringFederations = true
    nostr.previewTargetCount = 1
    nostr.discoveryCandidates = [{ federationId: 'fed-1', inviteCode: 'invite-1', createdAt: 30 }]
    setCachedPreview(nostr, createFederation('fed-1', 'invite-1', 'Cached Federation'), 30)

    nostr.enqueueCandidatesForPreview()
    await nostr.processPreviewQueue()

    const candidate = nostr.discoveryCandidates[0]
    expect(candidate).toBeDefined()
    if (candidate == null) {
      throw new Error('Expected discovery candidate to exist')
    }

    expect(walletStoreMock.previewFederation).not.toHaveBeenCalled()
    expect(nostr.getCachedPreviewForCandidate(candidate)).toEqual(
      createFederation('fed-1', 'invite-1', 'Cached Federation'),
    )
    expect(nostr.getPreviewStatusForFederationId('fed-1')).toBe('ready')
  })

  it('invalidates cached previews when a newer federation event arrives', () => {
    const nostr = useNostrStore()
    nostr.isDiscoveringFederations = true
    nostr.previewTargetCount = 1
    nostr.discoveryCandidates = [{ federationId: 'fed-1', inviteCode: 'invite-1', createdAt: 30 }]
    setCachedPreview(nostr, createFederation('fed-1', 'invite-1', 'Cached Federation'), 30)

    nostr.handleFederationEvent(
      createFederationEvent({
        federationId: 'fed-1',
        inviteCode: 'invite-1-updated',
        createdAt: 31,
      }),
    )

    expect(nostr.previewCacheByFederation['fed-1']).toBeUndefined()
    expect(nostr.discoveryCandidates[0]?.inviteCode).toBe('invite-1-updated')
  })

  it('times out hanging previews and continues with remaining candidates', async () => {
    vi.useFakeTimers()

    const nostr = useNostrStore()
    nostr.isDiscoveringFederations = true
    nostr.previewTargetCount = 1
    nostr.discoveryCandidates = [
      { federationId: 'fed-1', inviteCode: 'invite-1', createdAt: 30 },
      { federationId: 'fed-2', inviteCode: 'invite-2', createdAt: 20 },
    ]

    walletStoreMock.previewFederation
      .mockImplementationOnce(() => {
        return new Promise<Federation | undefined>(() => {})
      })
      .mockResolvedValueOnce(createFederation('fed-2', 'invite-2', 'Second'))

    nostr.enqueueCandidatesForPreview()
    const processingPromise = nostr.processPreviewQueue()

    await vi.advanceTimersByTimeAsync(7_000)
    await processingPromise

    expect(walletStoreMock.previewFederation).toHaveBeenCalledTimes(2)
    expect(nostr.discoveredFederations).toHaveLength(1)
    expect(nostr.discoveredFederations[0]?.federationId).toBe('fed-2')
    expect(nostr.previewStatusByFederation['fed-1']).toBe('timed_out')
  })

  it('logs expected discovery failures as warnings instead of hard errors', async () => {
    const errorSpy = vi.spyOn(logger, 'error')
    const warnSpy = vi.spyOn(logger.nostr, 'warn')

    const nostr = useNostrStore()
    nostr.isDiscoveringFederations = true
    nostr.previewTargetCount = 1
    nostr.discoveryCandidates = [{ federationId: 'fed-1', inviteCode: 'invite-1', createdAt: 30 }]
    walletStoreMock.previewFederation.mockRejectedValue(
      new Error('Failed to download client config'),
    )

    nostr.enqueueCandidatesForPreview()
    await nostr.processPreviewQueue()

    expect(warnSpy).toHaveBeenCalledWith(
      'Skipping federation candidate with unavailable config',
      expect.objectContaining({
        federationId: 'fed-1',
        reason: 'Failed to download client config',
      }),
    )
    expect(nostr.previewStatusByFederation['fed-1']).toBe('failed')
    expect(errorSpy).not.toHaveBeenCalledWith(
      'Unexpected error while previewing federation candidate',
      expect.anything(),
    )
  })

  it('treats GetDirectory security errors as expected discovery failures', async () => {
    const errorSpy = vi.spyOn(logger, 'error')
    const warnSpy = vi.spyOn(logger.nostr, 'warn')

    const nostr = useNostrStore()
    nostr.isDiscoveringFederations = true
    nostr.previewTargetCount = 1
    nostr.discoveryCandidates = [{ federationId: 'fed-1', inviteCode: 'invite-1', createdAt: 30 }]
    walletStoreMock.previewFederation.mockRejectedValue(
      new Error('{"federationId":"fed-1","error":"Security error when calling GetDirectory"}'),
    )

    nostr.enqueueCandidatesForPreview()
    await nostr.processPreviewQueue()

    expect(warnSpy).toHaveBeenCalledWith(
      'Skipping federation candidate with unavailable config',
      expect.objectContaining({
        federationId: 'fed-1',
        reason: expect.stringContaining('Security error when calling GetDirectory'),
      }),
    )
    expect(nostr.previewStatusByFederation['fed-1']).toBe('failed')
    expect(errorSpy).not.toHaveBeenCalledWith(
      'Unexpected error while previewing federation candidate',
      expect.anything(),
    )
  })

  it('keeps logging unexpected preview failures as errors', async () => {
    const errorSpy = vi.spyOn(logger, 'error')
    const warnSpy = vi.spyOn(logger.nostr, 'warn')

    const nostr = useNostrStore()
    nostr.isDiscoveringFederations = true
    nostr.previewTargetCount = 1
    nostr.discoveryCandidates = [{ federationId: 'fed-1', inviteCode: 'invite-1', createdAt: 30 }]
    walletStoreMock.previewFederation.mockRejectedValue(new Error('Unexpected parser crash'))

    nostr.enqueueCandidatesForPreview()
    await nostr.processPreviewQueue()

    expect(errorSpy).toHaveBeenCalledWith(
      'Unexpected error while previewing federation candidate',
      expect.objectContaining({
        federationId: 'fed-1',
        error: 'Unexpected parser crash',
      }),
    )
    expect(warnSpy).not.toHaveBeenCalledWith(
      'Skipping federation candidate with unavailable config',
      expect.anything(),
    )
  })

  it('waits for preview queue to become idle before continuing', async () => {
    vi.useFakeTimers()

    const nostr = useNostrStore()
    nostr.isPreviewQueueRunning = true

    const waitPromise = nostr.waitForPreviewQueueIdle(1_000)
    setTimeout(() => {
      nostr.isPreviewQueueRunning = false
    }, 120)

    await vi.advanceTimersByTimeAsync(200)

    await expect(waitPromise).resolves.toBe(true)
  })

  it('returns false when preview queue does not become idle in time', async () => {
    vi.useFakeTimers()

    const nostr = useNostrStore()
    nostr.isPreviewQueueRunning = true

    const waitPromise = nostr.waitForPreviewQueueIdle(100)
    await vi.advanceTimersByTimeAsync(150)

    await expect(waitPromise).resolves.toBe(false)
  })

  it('prioritizes candidates with higher recommendation counts', () => {
    const nostr = useNostrStore()
    nostr.discoveryCandidates = [
      { federationId: 'fed-older', inviteCode: 'invite-1', createdAt: 10 },
      { federationId: 'fed-newer', inviteCode: 'invite-2', createdAt: 20 },
    ]

    nostr.handleRecommendationEvent(
      createRecommendationEvent({
        pubkey: 'pubkey-a',
        createdAt: 100,
        federationIds: ['fed-older'],
      }),
    )

    expect(nostr.recommendationCountsByFederation['fed-older']).toBe(1)
    expect(nostr.discoveryCandidates[0]?.federationId).toBe('fed-older')
  })

  it('counts unique recommenders without double-counting the same pubkey', () => {
    const nostr = useNostrStore()
    nostr.discoveryCandidates = [{ federationId: 'fed-1', inviteCode: 'invite-1', createdAt: 10 }]

    nostr.handleRecommendationEvent(
      createRecommendationEvent({
        pubkey: 'pubkey-a',
        createdAt: 100,
        federationIds: ['fed-1'],
      }),
    )
    nostr.handleRecommendationEvent(
      createRecommendationEvent({
        pubkey: 'pubkey-a',
        createdAt: 101,
        federationIds: ['fed-1'],
      }),
    )
    nostr.handleRecommendationEvent(
      createRecommendationEvent({
        pubkey: 'pubkey-b',
        createdAt: 102,
        federationIds: ['fed-1'],
      }),
    )

    expect(nostr.recommendationCountsByFederation['fed-1']).toBe(2)
  })

  it('ignores recommendation events when federation pointers are missing', () => {
    const nostr = useNostrStore()
    nostr.discoveryCandidates = [{ federationId: 'fed-2', inviteCode: 'invite-2', createdAt: 10 }]

    nostr.handleRecommendationEvent(
      createRecommendationEvent({
        pubkey: 'pubkey-a',
        createdAt: 100,
        inviteCodes: ['invite-2'],
      }),
    )

    expect(nostr.recommendationCountsByFederation['fed-2']).toBeUndefined()
    expect(nostr.discoveryCandidates[0]?.recommendationCount ?? 0).toBe(0)
  })

  it('maps recommendation pointers to federation ids', () => {
    const nostr = useNostrStore()
    nostr.discoveryCandidates = [{ federationId: 'fed-3', inviteCode: 'invite-3', createdAt: 10 }]

    nostr.handleRecommendationEvent(
      createRecommendationEvent({
        pubkey: 'pubkey-a',
        createdAt: 100,
        federationIds: ['fed-3'],
      }),
    )

    expect(nostr.discoveryCandidates[0]?.recommendationCount).toBe(1)
    expect(nostr.recommendationCountsByFederation['fed-3']).toBe(1)
  })

  it('keeps higher recommendation count when federation event updates candidate metadata', () => {
    const nostr = useNostrStore()
    nostr.discoveryCandidates = [
      { federationId: 'fed-1', inviteCode: 'invite-1', createdAt: 10, recommendationCount: 5 },
    ]

    nostr.handleFederationEvent(
      createFederationEvent({
        federationId: 'fed-1',
        inviteCode: 'invite-1-updated',
        createdAt: 11,
      }),
    )

    expect(nostr.discoveryCandidates[0]?.recommendationCount).toBe(5)
  })

  it('preserves recommendation count when preview resolves the same federation id', async () => {
    const nostr = useNostrStore()
    nostr.isDiscoveringFederations = true
    nostr.previewTargetCount = 1
    nostr.discoveryCandidates = [
      {
        federationId: 'resolved-fed',
        inviteCode: 'invite-candidate',
        createdAt: 10,
        recommendationCount: 2,
      },
    ]
    nostr.recommendationCountsByFederation['resolved-fed'] = 2
    nostr.recommendationVotersByFederation['resolved-fed'] = {
      'pubkey-a': 100,
      'pubkey-b': 101,
    }

    walletStoreMock.previewFederation.mockResolvedValue(
      createFederation('resolved-fed', 'invite-candidate', 'Resolved Federation'),
    )

    nostr.enqueueCandidatesForPreview()
    await nostr.processPreviewQueue()

    expect(nostr.discoveredFederations[0]?.federationId).toBe('resolved-fed')
    expect(nostr.recommendationCountsByFederation['resolved-fed']).toBe(2)
    expect(nostr.discoveryCandidates[0]?.recommendationCount).toBe(2)
  })

  it('marks candidates as failed when preview resolves a different federation id', async () => {
    const warnSpy = vi.spyOn(logger.nostr, 'warn')

    const nostr = useNostrStore()
    nostr.isDiscoveringFederations = true
    nostr.previewTargetCount = 1
    nostr.discoveryCandidates = [
      { federationId: 'candidate-fed', inviteCode: 'invite-candidate', createdAt: 10 },
    ]

    walletStoreMock.previewFederation.mockResolvedValue(
      createFederation('resolved-fed', 'invite-candidate', 'Resolved Federation'),
    )

    nostr.enqueueCandidatesForPreview()
    await nostr.processPreviewQueue()

    const candidate = nostr.discoveryCandidates[0]
    if (candidate == null) {
      throw new Error('Expected discovery candidate to exist')
    }

    expect(nostr.previewStatusByFederation['candidate-fed']).toBe('failed')
    expect(nostr.previewCacheByFederation['candidate-fed']).toBeUndefined()
    expect(nostr.discoveredFederations).toEqual([])
    expect(nostr.getCachedPreviewForCandidate(candidate)).toBeUndefined()
    expect(warnSpy).toHaveBeenCalledWith(
      'Skipping federation candidate with mismatched preview federation id',
      expect.objectContaining({
        federationId: 'candidate-fed',
        resolvedFederationId: 'resolved-fed',
        createdAt: 10,
      }),
    )
  })

  it('only queues a newly top-ranked candidate after enqueue is requested explicitly', () => {
    const nostr = useNostrStore()
    nostr.isDiscoveringFederations = true
    nostr.isJoinInProgress = true
    nostr.previewTargetCount = 1
    nostr.discoveryCandidates = [
      { federationId: 'fed-1', inviteCode: 'invite-1', createdAt: 50, recommendationCount: 4 },
      { federationId: 'fed-2', inviteCode: 'invite-2', createdAt: 40, recommendationCount: 4 },
      { federationId: 'fed-3', inviteCode: 'invite-3', createdAt: 30, recommendationCount: 3 },
      { federationId: 'fed-4', inviteCode: 'invite-4', createdAt: 20, recommendationCount: 2 },
      { federationId: 'fed-5', inviteCode: 'invite-5', createdAt: 10, recommendationCount: 1 },
    ]
    setCachedPreview(nostr, createFederation('fed-1', 'invite-1', 'Cached Top'), 50)

    nostr.enqueueCandidatesForPreview()
    expect(nostr.previewQueue).not.toContain('fed-5')

    nostr.handleRecommendationEvent(
      createRecommendationEvent({
        pubkey: 'pubkey-a',
        createdAt: 100,
        federationIds: ['fed-5'],
      }),
    )
    nostr.handleRecommendationEvent(
      createRecommendationEvent({
        pubkey: 'pubkey-b',
        createdAt: 101,
        federationIds: ['fed-5'],
      }),
    )
    nostr.handleRecommendationEvent(
      createRecommendationEvent({
        pubkey: 'pubkey-c',
        createdAt: 102,
        federationIds: ['fed-5'],
      }),
    )
    nostr.handleRecommendationEvent(
      createRecommendationEvent({
        pubkey: 'pubkey-d',
        createdAt: 103,
        federationIds: ['fed-5'],
      }),
    )
    nostr.handleRecommendationEvent(
      createRecommendationEvent({
        pubkey: 'pubkey-e',
        createdAt: 104,
        federationIds: ['fed-5'],
      }),
    )

    expect(nostr.discoveryCandidates[0]?.federationId).toBe('fed-5')
    expect(nostr.previewQueue).not.toContain('fed-5')

    nostr.enqueueCandidatesForPreview()

    expect(nostr.previewQueue).toContain('fed-5')
  })

  it('syncs payable contacts from a NIP-05 identifier', async () => {
    const nostr = useNostrStore()
    const followSet = new Set([PAYABLE_LUD16_PUBKEY, PAYABLE_LUD06_PUBKEY, NON_PAYABLE_PUBKEY])
    const fetchUser = vi.fn().mockResolvedValue({
      pubkey: SOURCE_PUBKEY,
      followSet: vi.fn().mockResolvedValue(followSet),
    })
    const fetchEvents = vi.fn().mockResolvedValue(
      new Set([
        createProfileEvent(PAYABLE_LUD16_PUBKEY, 10, {
          display_name: 'Alice',
          lud16: 'alice@getalby.com',
        }),
        createProfileEvent(PAYABLE_LUD06_PUBKEY, 11, {
          name: 'Bob',
          lud06: 'lnurl1dp68gurn8ghj7m',
        }),
        createProfileEvent(NON_PAYABLE_PUBKEY, 12, {
          name: 'Carol',
        }),
      ]),
    )

    nostr.ndk = {
      fetchUser,
      fetchEvents,
    } as unknown as NonNullable<typeof nostr.ndk>
    nostr.setContactSource('alice@example.com')

    await expect(nostr.syncContacts()).resolves.toBe(true)

    expect(fetchUser).toHaveBeenCalledWith('alice@example.com')
    expect(fetchEvents).toHaveBeenCalledWith({
      kinds: [0],
      authors: [PAYABLE_LUD16_PUBKEY, PAYABLE_LUD06_PUBKEY, NON_PAYABLE_PUBKEY],
    })
    expect(nostr.contactSource.resolvedPubkey).toBe(SOURCE_PUBKEY)
    expect(nostr.contacts).toHaveLength(2)
    expect(nostr.contacts.map((contact) => contact.paymentTarget)).toEqual([
      'alice@getalby.com',
      'lnurl1dp68gurn8ghj7m',
    ])
    expect(nostr.contacts.find((contact) => contact.pubkey === PAYABLE_LUD16_PUBKEY)?.lud16).toBe(
      'alice@getalby.com',
    )
    expect(nostr.contactSyncMeta.lastSyncedAt).not.toBeNull()
    expect(nostr.contactSyncMeta.lastSyncError).toBeNull()
    expect(nostr.syncStatus).toBe('success')
  })

  it('syncs contacts from an npub source and replaces the stored contacts on re-sync', async () => {
    const nostr = useNostrStore()
    const firstContact = createProfileEvent(PAYABLE_LUD16_PUBKEY, 10, {
      display_name: 'Alice',
      lud16: 'alice@getalby.com',
    })
    const secondContact = createProfileEvent(PAYABLE_LUD06_PUBKEY, 11, {
      display_name: 'Bob',
      lud06: 'lnurl1dp68gurn8ghj7m',
    })
    const followSet = vi
      .fn()
      .mockResolvedValueOnce(new Set([PAYABLE_LUD16_PUBKEY]))
      .mockResolvedValueOnce(new Set([PAYABLE_LUD06_PUBKEY]))
    const fetchUser = vi.fn().mockResolvedValue({
      pubkey: SOURCE_PUBKEY,
      followSet,
    })
    const fetchEvents = vi
      .fn()
      .mockResolvedValueOnce(new Set([firstContact]))
      .mockResolvedValueOnce(new Set([secondContact]))

    nostr.ndk = {
      fetchUser,
      fetchEvents,
    } as unknown as NonNullable<typeof nostr.ndk>
    nostr.contacts = [
      {
        pubkey: NON_PAYABLE_PUBKEY,
        npub: nip19.npubEncode(NON_PAYABLE_PUBKEY),
        paymentTarget: 'stale@getalby.com',
      },
    ]
    nostr.setContactSource(SOURCE_NPUB)

    await expect(nostr.syncContacts()).resolves.toBe(true)
    expect(fetchUser).toHaveBeenCalledWith(SOURCE_NPUB)
    expect(nostr.contacts).toHaveLength(1)
    expect(nostr.contacts[0]?.pubkey).toBe(PAYABLE_LUD16_PUBKEY)

    await expect(nostr.syncContacts()).resolves.toBe(true)
    expect(nostr.contacts).toHaveLength(1)
    expect(nostr.contacts[0]?.pubkey).toBe(PAYABLE_LUD06_PUBKEY)
  })

  it('does not sync contacts implicitly on store creation', () => {
    const nostr = useNostrStore()

    expect(nostr.contacts).toEqual([])
    expect(nostr.contactSource).toEqual({
      sourceType: 'nip05',
      sourceValue: '',
      resolvedPubkey: null,
    })
    expect(nostr.syncStatus).toBe('idle')
    expect(nostr.contactSyncMeta.lastSyncedAt).toBeNull()
  })

  it('stores sync errors when contact sync fails', async () => {
    const nostr = useNostrStore()
    nostr.ndk = {
      fetchUser: vi.fn().mockRejectedValue(new Error('Relay timeout')),
    } as unknown as NonNullable<typeof nostr.ndk>
    nostr.setContactSource('alice@example.com')

    await expect(nostr.syncContacts()).resolves.toBe(false)

    expect(nostr.contacts).toEqual([])
    expect(nostr.contactSyncMeta.lastSyncError).toBe('Relay timeout')
    expect(nostr.syncStatus).toBe('error')
  })
})
