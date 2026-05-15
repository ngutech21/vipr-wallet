import type { Federation } from 'src/types/federation'
import {
  sortDiscoveredFederationCandidates,
  type DiscoveredFederationCandidate,
} from 'src/services/nostr/discovery'
import type {
  PreviewFederationCandidateResult,
  PreviewStatus,
} from 'src/services/nostr/previewQueue'

export type PreviewDiscoveryState = {
  discoveryCandidates: DiscoveredFederationCandidate[]
  previewAttemptedCreatedAt: Record<string, number>
  previewErrorLoggedCreatedAt: Record<string, number>
  previewStatusByFederation: Record<string, PreviewStatus>
}

export type PreviewDiscoveryEffect =
  | {
      type: 'cache-preview'
      candidate: DiscoveredFederationCandidate
      federation: Federation
    }
  | {
      type: 'remove-cached-preview'
      federationId: string
    }
  | {
      type: 'log-timeout'
      federationId: string
    }
  | {
      type: 'log-expected-error'
      federationId: string
      createdAt: number
      errorMessage: string
    }
  | {
      type: 'log-unexpected-error'
      federationId: string
      errorMessage: string
    }
  | {
      type: 'log-mismatch'
      federationId: string
      resolvedFederationId: string
      createdAt: number
    }

export type PreviewDiscoveryUpdate = {
  state: PreviewDiscoveryState
  effects: PreviewDiscoveryEffect[]
}

export function markPreviewLoading(
  state: PreviewDiscoveryState,
  candidate: DiscoveredFederationCandidate,
): PreviewDiscoveryState {
  return {
    ...state,
    previewAttemptedCreatedAt: {
      ...state.previewAttemptedCreatedAt,
      [candidate.federationId]: candidate.createdAt,
    },
    previewStatusByFederation: {
      ...state.previewStatusByFederation,
      [candidate.federationId]: 'loading',
    },
  }
}

export function markPreviewReady(
  state: PreviewDiscoveryState,
  candidate: DiscoveredFederationCandidate,
): PreviewDiscoveryState {
  return setPreviewStatus(state, candidate, 'ready')
}

export function markPreviewFailed(
  state: PreviewDiscoveryState,
  candidate: DiscoveredFederationCandidate,
): PreviewDiscoveryState {
  return setPreviewStatusAndSortCandidates(state, candidate, 'failed')
}

export function markPreviewTimedOut(
  state: PreviewDiscoveryState,
  candidate: DiscoveredFederationCandidate,
): PreviewDiscoveryState {
  return setPreviewStatusAndSortCandidates(state, candidate, 'timed_out')
}

export function clearPreviewStateForFederation(
  state: PreviewDiscoveryState,
  federationId: string,
): PreviewDiscoveryState {
  return {
    ...state,
    previewAttemptedCreatedAt: omitRecordKey(state.previewAttemptedCreatedAt, federationId),
    previewErrorLoggedCreatedAt: omitRecordKey(state.previewErrorLoggedCreatedAt, federationId),
    previewStatusByFederation: omitRecordKey(state.previewStatusByFederation, federationId),
  }
}

export function applyPreviewResultToDiscoveryState(
  state: PreviewDiscoveryState,
  candidate: DiscoveredFederationCandidate,
  result: PreviewFederationCandidateResult,
): PreviewDiscoveryUpdate {
  if (result.type === 'timed-out') {
    return {
      state: markPreviewTimedOut(state, candidate),
      effects: [
        {
          type: 'log-timeout',
          federationId: candidate.federationId,
        },
      ],
    }
  }

  if (result.type === 'not-found') {
    return {
      state: markPreviewFailed(state, candidate),
      effects: [],
    }
  }

  if (result.type === 'failed') {
    const failedState = markPreviewFailed(state, candidate)

    if (!result.isExpectedError) {
      return {
        state: failedState,
        effects: [
          {
            type: 'log-unexpected-error',
            federationId: candidate.federationId,
            errorMessage: result.errorMessage,
          },
        ],
      }
    }

    const lastLoggedCreatedAt = state.previewErrorLoggedCreatedAt[candidate.federationId]
    if (lastLoggedCreatedAt != null && lastLoggedCreatedAt >= candidate.createdAt) {
      return {
        state: failedState,
        effects: [],
      }
    }

    return {
      state: {
        ...failedState,
        previewErrorLoggedCreatedAt: {
          ...failedState.previewErrorLoggedCreatedAt,
          [candidate.federationId]: candidate.createdAt,
        },
      },
      effects: [
        {
          type: 'log-expected-error',
          federationId: candidate.federationId,
          createdAt: candidate.createdAt,
          errorMessage: result.errorMessage,
        },
      ],
    }
  }

  if (result.type === 'mismatched') {
    return {
      state: markPreviewFailed(state, candidate),
      effects: [
        {
          type: 'remove-cached-preview',
          federationId: candidate.federationId,
        },
        {
          type: 'log-mismatch',
          federationId: candidate.federationId,
          resolvedFederationId: result.federation.federationId,
          createdAt: candidate.createdAt,
        },
      ],
    }
  }

  return {
    state: markPreviewReady(state, candidate),
    effects: [
      {
        type: 'cache-preview',
        candidate,
        federation: result.federation,
      },
    ],
  }
}

function setPreviewStatus(
  state: PreviewDiscoveryState,
  candidate: DiscoveredFederationCandidate,
  status: PreviewStatus,
): PreviewDiscoveryState {
  return {
    ...state,
    previewStatusByFederation: {
      ...state.previewStatusByFederation,
      [candidate.federationId]: status,
    },
  }
}

function setPreviewStatusAndSortCandidates(
  state: PreviewDiscoveryState,
  candidate: DiscoveredFederationCandidate,
  status: PreviewStatus,
): PreviewDiscoveryState {
  return {
    ...setPreviewStatus(state, candidate, status),
    discoveryCandidates: sortDiscoveredFederationCandidates(state.discoveryCandidates),
  }
}

function omitRecordKey<T>(record: Record<string, T>, keyToOmit: string): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([key]) => key !== keyToOmit))
}
