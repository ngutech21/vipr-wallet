import { describe, expect, it } from 'vitest'
import type { Federation } from 'src/types/federation'
import type { DiscoveredFederationCandidate } from 'src/services/nostr/discovery'
import {
  applyPreviewResultToDiscoveryState,
  clearPreviewStateForFederation,
  markPreviewLoading,
  markPreviewReady,
  type PreviewDiscoveryState,
} from 'src/services/nostr/previewDiscoveryState'

function createCandidate(
  federationId: string,
  createdAt: number,
  recommendationCount?: number,
): DiscoveredFederationCandidate {
  return {
    federationId,
    inviteCode: `invite-${federationId}`,
    createdAt,
    ...(recommendationCount != null ? { recommendationCount } : {}),
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

function createState(overrides: Partial<PreviewDiscoveryState> = {}): PreviewDiscoveryState {
  return {
    discoveryCandidates: [],
    previewAttemptedCreatedAt: {},
    previewErrorLoggedCreatedAt: {},
    previewStatusByFederation: {},
    ...overrides,
  }
}

describe('nostr preview discovery state service', () => {
  it('marks previews as loading without mutating the previous state', () => {
    const candidate = createCandidate('fed-1', 20)
    const state = createState({
      previewAttemptedCreatedAt: {
        'fed-old': 10,
      },
      previewStatusByFederation: {
        'fed-old': 'failed',
      },
    })

    const nextState = markPreviewLoading(state, candidate)

    expect(state).toEqual(
      createState({
        previewAttemptedCreatedAt: {
          'fed-old': 10,
        },
        previewStatusByFederation: {
          'fed-old': 'failed',
        },
      }),
    )
    expect(nextState).toEqual(
      createState({
        previewAttemptedCreatedAt: {
          'fed-old': 10,
          'fed-1': 20,
        },
        previewStatusByFederation: {
          'fed-old': 'failed',
          'fed-1': 'loading',
        },
      }),
    )
  })

  it('marks cached previews as ready without touching attempted timestamps', () => {
    const state = createState({
      previewAttemptedCreatedAt: {
        'fed-1': 10,
      },
    })

    expect(markPreviewReady(state, createCandidate('fed-1', 20))).toEqual(
      createState({
        previewAttemptedCreatedAt: {
          'fed-1': 10,
        },
        previewStatusByFederation: {
          'fed-1': 'ready',
        },
      }),
    )
  })

  it('converts timed out previews into sorted state updates and a log effect', () => {
    const state = createState({
      discoveryCandidates: [createCandidate('fed-low', 30, 0), createCandidate('fed-high', 10, 5)],
    })

    const update = applyPreviewResultToDiscoveryState(state, createCandidate('fed-low', 30), {
      type: 'timed-out',
    })

    expect(update.state.previewStatusByFederation).toEqual({
      'fed-low': 'timed_out',
    })
    expect(update.state.discoveryCandidates.map((candidate) => candidate.federationId)).toEqual([
      'fed-high',
      'fed-low',
    ])
    expect(update.effects).toEqual([
      {
        type: 'log-timeout',
        federationId: 'fed-low',
      },
    ])
  })

  it('deduplicates expected preview error logging by candidate createdAt', () => {
    const candidate = createCandidate('fed-1', 20)
    const firstUpdate = applyPreviewResultToDiscoveryState(createState(), candidate, {
      type: 'failed',
      error: new Error('Failed to fetch'),
      errorMessage: 'Failed to fetch',
      isExpectedError: true,
    })

    expect(firstUpdate.state.previewStatusByFederation).toEqual({
      'fed-1': 'failed',
    })
    expect(firstUpdate.state.previewErrorLoggedCreatedAt).toEqual({
      'fed-1': 20,
    })
    expect(firstUpdate.effects).toEqual([
      {
        type: 'log-expected-error',
        federationId: 'fed-1',
        createdAt: 20,
        errorMessage: 'Failed to fetch',
      },
    ])

    const repeatedUpdate = applyPreviewResultToDiscoveryState(firstUpdate.state, candidate, {
      type: 'failed',
      error: new Error('Failed to fetch'),
      errorMessage: 'Failed to fetch',
      isExpectedError: true,
    })

    expect(repeatedUpdate.state.previewErrorLoggedCreatedAt).toEqual({
      'fed-1': 20,
    })
    expect(repeatedUpdate.effects).toEqual([])
  })

  it('returns explicit effects for unexpected, mismatched, and ready results', () => {
    const candidate = createCandidate('fed-1', 20)

    expect(
      applyPreviewResultToDiscoveryState(createState(), candidate, {
        type: 'failed',
        error: new Error('boom'),
        errorMessage: 'boom',
        isExpectedError: false,
      }).effects,
    ).toEqual([
      {
        type: 'log-unexpected-error',
        federationId: 'fed-1',
        errorMessage: 'boom',
      },
    ])

    expect(
      applyPreviewResultToDiscoveryState(createState(), candidate, {
        type: 'mismatched',
        federation: createFederation('fed-2'),
      }).effects,
    ).toEqual([
      {
        type: 'remove-cached-preview',
        federationId: 'fed-1',
      },
      {
        type: 'log-mismatch',
        federationId: 'fed-1',
        resolvedFederationId: 'fed-2',
        createdAt: 20,
      },
    ])

    expect(
      applyPreviewResultToDiscoveryState(createState(), candidate, {
        type: 'ready',
        federation: createFederation('fed-1'),
      }),
    ).toEqual({
      state: createState({
        previewStatusByFederation: {
          'fed-1': 'ready',
        },
      }),
      effects: [
        {
          type: 'cache-preview',
          candidate,
          federation: createFederation('fed-1'),
        },
      ],
    })
  })

  it('clears preview state for invalidated federation candidates', () => {
    expect(
      clearPreviewStateForFederation(
        createState({
          previewAttemptedCreatedAt: {
            'fed-1': 20,
            'fed-2': 10,
          },
          previewErrorLoggedCreatedAt: {
            'fed-1': 20,
            'fed-2': 10,
          },
          previewStatusByFederation: {
            'fed-1': 'failed',
            'fed-2': 'ready',
          },
        }),
        'fed-1',
      ),
    ).toEqual(
      createState({
        previewAttemptedCreatedAt: {
          'fed-2': 10,
        },
        previewErrorLoggedCreatedAt: {
          'fed-2': 10,
        },
        previewStatusByFederation: {
          'fed-2': 'ready',
        },
      }),
    )
  })
})
