import { describe, expect, it, vi } from 'vitest'
import type { Federation } from 'src/types/federation'
import type { DiscoveredFederationCandidate } from 'src/services/nostr/discovery'
import {
  buildPreviewQueue,
  previewFederationCandidate,
  takeNextPreviewCandidate,
  waitUntilPreviewQueueIdle,
} from 'src/services/nostr/previewQueue'

function createCandidate(federationId: string, createdAt: number): DiscoveredFederationCandidate {
  return {
    federationId,
    inviteCode: `invite-${federationId}`,
    createdAt,
  }
}

function createFederation(federationId: string): Federation {
  return {
    federationId,
    inviteCode: `invite-${federationId}`,
    title: federationId,
    modules: [],
  }
}

describe('nostr preview queue service', () => {
  it('builds the preview queue without mutating existing queue or status objects', () => {
    const currentQueue = ['stale-fed', 'fed-2']
    const previewStatusByFederation = {
      'fed-1': 'failed' as const,
    }
    const result = buildPreviewQueue({
      currentQueue,
      discoveryCandidates: [
        createCandidate('fed-1', 30),
        createCandidate('fed-2', 20),
        createCandidate('fed-3', 10),
      ],
      previewTargetCount: 1,
      previewQueueOverscan: 1,
      previewAttemptedCreatedAt: {
        'fed-1': 29,
      },
      previewStatusByFederation,
      hasCachedPreview: (candidate) => candidate.federationId === 'fed-3',
    })

    expect(currentQueue).toEqual(['stale-fed', 'fed-2'])
    expect(previewStatusByFederation).toEqual({
      'fed-1': 'failed',
    })
    expect(result).toEqual({
      previewQueue: ['fed-2', 'fed-1'],
      previewStatusByFederation: {
        'fed-1': 'failed',
      },
    })
  })

  it('marks cached candidates in the preview window as ready', () => {
    expect(
      buildPreviewQueue({
        currentQueue: [],
        discoveryCandidates: [createCandidate('fed-1', 30), createCandidate('fed-2', 20)],
        previewTargetCount: 1,
        previewQueueOverscan: 1,
        previewAttemptedCreatedAt: {},
        previewStatusByFederation: {},
        hasCachedPreview: (candidate) => candidate.federationId === 'fed-1',
      }),
    ).toEqual({
      previewQueue: ['fed-2'],
      previewStatusByFederation: {
        'fed-1': 'ready',
      },
    })
  })

  it('does not requeue unchanged candidates that were already attempted', () => {
    expect(
      buildPreviewQueue({
        currentQueue: [],
        discoveryCandidates: [createCandidate('fed-1', 30), createCandidate('fed-2', 20)],
        previewTargetCount: 2,
        previewQueueOverscan: 0,
        previewAttemptedCreatedAt: {
          'fed-1': 30,
        },
        previewStatusByFederation: {},
        hasCachedPreview: () => false,
      }).previewQueue,
    ).toEqual(['fed-2'])
  })

  it('takes the next queued candidate immutably', () => {
    const previewQueue = ['fed-1', 'fed-2']
    const result = takeNextPreviewCandidate({
      previewQueue,
      discoveryCandidates: [createCandidate('fed-1', 30), createCandidate('fed-2', 20)],
    })

    expect(previewQueue).toEqual(['fed-1', 'fed-2'])
    expect(result.previewQueue).toEqual(['fed-2'])
    expect(result.candidate?.federationId).toBe('fed-1')
  })

  it('classifies successful, failed, mismatched, and timed out previews', async () => {
    const candidate = createCandidate('fed-1', 30)

    await expect(
      previewFederationCandidate({
        candidate,
        previewFederation: vi.fn(() => Promise.resolve(createFederation('fed-1'))),
        timeoutMs: 100,
      }),
    ).resolves.toEqual({
      type: 'ready',
      federation: createFederation('fed-1'),
    })

    await expect(
      previewFederationCandidate({
        candidate,
        previewFederation: vi.fn(() => Promise.resolve(undefined)),
        timeoutMs: 100,
      }),
    ).resolves.toEqual({
      type: 'failed',
      isExpectedError: false,
    })

    await expect(
      previewFederationCandidate({
        candidate,
        previewFederation: vi.fn(() => Promise.resolve(createFederation('fed-2'))),
        timeoutMs: 100,
      }),
    ).resolves.toEqual({
      type: 'mismatched',
      federation: createFederation('fed-2'),
    })
  })

  it('classifies expected preview errors', async () => {
    await expect(
      previewFederationCandidate({
        candidate: createCandidate('fed-1', 30),
        previewFederation: vi.fn(() =>
          Promise.reject(new Error('Failed to download client config')),
        ),
        timeoutMs: 100,
      }),
    ).resolves.toMatchObject({
      type: 'failed',
      errorMessage: 'Failed to download client config',
      isExpectedError: true,
    })
  })

  it('classifies hanging previews as timed out', async () => {
    vi.useFakeTimers()

    const resultPromise = previewFederationCandidate({
      candidate: createCandidate('fed-1', 30),
      previewFederation: vi.fn(() => new Promise<Federation | undefined>(() => {})),
      timeoutMs: 100,
    })

    await vi.advanceTimersByTimeAsync(100)

    await expect(resultPromise).resolves.toEqual({
      type: 'timed_out',
    })

    vi.useRealTimers()
  })

  it('waits until the preview queue becomes idle', async () => {
    vi.useFakeTimers()
    let running = true
    const waitPromise = waitUntilPreviewQueueIdle({
      isPreviewQueueRunning: () => running,
      timeoutMs: 1_000,
      pollMs: 50,
    })
    setTimeout(() => {
      running = false
    }, 120)

    await vi.advanceTimersByTimeAsync(200)

    await expect(waitPromise).resolves.toBe(true)
    vi.useRealTimers()
  })
})
