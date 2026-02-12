import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Federation } from 'src/components/models'
import type { NDKEvent } from '@nostr-dev-kit/ndk'
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
    kind: Nip87Kinds.Reccomendation,
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
    expect(nostr.discoveredFederations.map((f) => f.federationId)).toEqual(['fed-2', 'fed-3'])
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

  it('retries a candidate when a newer federation event arrives', async () => {
    const nostr = useNostrStore()
    nostr.isDiscoveringFederations = true
    nostr.previewTargetCount = 1
    nostr.discoveryCandidates = [{ federationId: 'fed-1', inviteCode: 'invite-1', createdAt: 30 }]

    walletStoreMock.previewFederation
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(createFederation('fed-1', 'invite-1-updated', 'Updated'))

    nostr.enqueueCandidatesForPreview()
    await nostr.processPreviewQueue()

    await nostr.handleFederationEvent(
      createFederationEvent({
        federationId: 'fed-1',
        inviteCode: 'invite-1-updated',
        createdAt: 31,
      }),
    )

    expect(walletStoreMock.previewFederation).toHaveBeenCalledTimes(2)
    expect(nostr.discoveredFederations).toHaveLength(1)
    expect(nostr.discoveredFederations[0]?.federationId).toBe('fed-1')
    expect(nostr.discoveredFederations[0]?.inviteCode).toBe('invite-1-updated')
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

  it('prioritizes candidates with higher recommendation counts', async () => {
    const nostr = useNostrStore()
    nostr.discoveryCandidates = [
      { federationId: 'fed-older', inviteCode: 'invite-1', createdAt: 10 },
      { federationId: 'fed-newer', inviteCode: 'invite-2', createdAt: 20 },
    ]

    await nostr.handleRecommendationEvent(
      createRecommendationEvent({
        pubkey: 'pubkey-a',
        createdAt: 100,
        federationIds: ['fed-older'],
      }),
    )

    expect(nostr.recommendationCountsByFederation['fed-older']).toBe(1)
    expect(nostr.discoveryCandidates[0]?.federationId).toBe('fed-older')
  })

  it('counts unique recommenders without double-counting the same pubkey', async () => {
    const nostr = useNostrStore()
    nostr.discoveryCandidates = [{ federationId: 'fed-1', inviteCode: 'invite-1', createdAt: 10 }]

    await nostr.handleRecommendationEvent(
      createRecommendationEvent({
        pubkey: 'pubkey-a',
        createdAt: 100,
        federationIds: ['fed-1'],
      }),
    )
    await nostr.handleRecommendationEvent(
      createRecommendationEvent({
        pubkey: 'pubkey-a',
        createdAt: 101,
        federationIds: ['fed-1'],
      }),
    )
    await nostr.handleRecommendationEvent(
      createRecommendationEvent({
        pubkey: 'pubkey-b',
        createdAt: 102,
        federationIds: ['fed-1'],
      }),
    )

    expect(nostr.recommendationCountsByFederation['fed-1']).toBe(2)
  })

  it('ignores recommendation events when federation pointers are missing', async () => {
    const nostr = useNostrStore()
    nostr.discoveryCandidates = [{ federationId: 'fed-2', inviteCode: 'invite-2', createdAt: 10 }]

    await nostr.handleRecommendationEvent(
      createRecommendationEvent({
        pubkey: 'pubkey-a',
        createdAt: 100,
        inviteCodes: ['invite-2'],
      }),
    )

    expect(nostr.recommendationCountsByFederation['fed-2']).toBeUndefined()
    expect(nostr.discoveryCandidates[0]?.recommendationCount ?? 0).toBe(0)
  })

  it('maps recommendation pointers to federation ids', async () => {
    const nostr = useNostrStore()
    nostr.discoveryCandidates = [{ federationId: 'fed-3', inviteCode: 'invite-3', createdAt: 10 }]

    await nostr.handleRecommendationEvent(
      createRecommendationEvent({
        pubkey: 'pubkey-a',
        createdAt: 100,
        federationIds: ['fed-3'],
      }),
    )

    expect(nostr.discoveryCandidates[0]?.recommendationCount).toBe(1)
    expect(nostr.recommendationCountsByFederation['fed-3']).toBe(1)
  })

  it('does not drop existing candidate recommendation counts when recomputing', () => {
    const nostr = useNostrStore()
    nostr.discoveryCandidates = [
      {
        federationId: 'candidate-fed',
        inviteCode: 'invite-shared',
        createdAt: 10,
        recommendationCount: 7,
      },
    ]

    nostr.applyRecommendationCountsToCandidates()

    expect(nostr.discoveryCandidates[0]?.recommendationCount).toBe(7)
  })

  it('keeps higher recommendation count when federation event updates candidate metadata', async () => {
    const nostr = useNostrStore()
    nostr.discoveryCandidates = [
      { federationId: 'fed-1', inviteCode: 'invite-1', createdAt: 10, recommendationCount: 5 },
    ]

    await nostr.handleFederationEvent(
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
      { federationId: 'resolved-fed', inviteCode: 'invite-candidate', createdAt: 10 },
    ]
    nostr.recommendationCountsByFederation['resolved-fed'] = 2
    nostr.recommendationVotersByFederation['resolved-fed'] = {
      'pubkey-a': 100,
      'pubkey-b': 101,
    }
    nostr.applyRecommendationCountsToCandidates()

    walletStoreMock.previewFederation.mockResolvedValue(
      createFederation('resolved-fed', 'invite-candidate', 'Resolved Federation'),
    )

    nostr.enqueueCandidatesForPreview()
    await nostr.processPreviewQueue()

    expect(nostr.discoveredFederations[0]?.federationId).toBe('resolved-fed')
    expect(nostr.recommendationCountsByFederation['resolved-fed']).toBe(2)
    expect(nostr.discoveryCandidates[0]?.recommendationCount).toBe(2)
  })
})
