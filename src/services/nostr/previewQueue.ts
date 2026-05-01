import type { Federation } from 'src/types/federation'
import { raceWithTimeout } from 'src/utils/async'
import { getErrorMessage } from 'src/utils/error'
import {
  doesPreviewMatchCandidate,
  isExpectedDiscoveryError,
  type DiscoveredFederationCandidate,
} from 'src/services/nostr/discovery'

export type PreviewStatus = 'loading' | 'failed' | 'timed_out' | 'ready'

export type BuildPreviewQueueResult = {
  previewQueue: string[]
  previewStatusByFederation: Record<string, PreviewStatus>
}

export type PreviewFederationCandidateResult =
  | {
      type: 'ready'
      federation: Federation
    }
  | {
      type: 'failed'
      error?: unknown
      errorMessage?: string
      isExpectedError: boolean
    }
  | {
      type: 'mismatched'
      federation: Federation
    }
  | {
      type: 'timed_out'
    }

const PREVIEW_TIMEOUT_TOKEN = Symbol('preview-timeout')

export function buildPreviewQueue({
  currentQueue,
  discoveryCandidates,
  previewTargetCount,
  previewQueueOverscan,
  previewAttemptedCreatedAt,
  previewStatusByFederation,
  hasCachedPreview,
}: {
  currentQueue: string[]
  discoveryCandidates: DiscoveredFederationCandidate[]
  previewTargetCount: number
  previewQueueOverscan: number
  previewAttemptedCreatedAt: Record<string, number>
  previewStatusByFederation: Record<string, PreviewStatus>
  hasCachedPreview: (candidate: DiscoveredFederationCandidate) => boolean
}): BuildPreviewQueueResult {
  const validCandidateIds = new Set(discoveryCandidates.map((candidate) => candidate.federationId))
  const nextPreviewQueue = currentQueue.filter((federationId) => {
    if (!validCandidateIds.has(federationId)) {
      return false
    }

    const candidate = discoveryCandidates.find((item) => item.federationId === federationId)
    return candidate != null && !hasCachedPreview(candidate)
  })
  const queuedIds = new Set(nextPreviewQueue)
  const readyStatusUpdates = Object.fromEntries(
    discoveryCandidates
      .slice(0, previewTargetCount + previewQueueOverscan)
      .filter((candidate) => hasCachedPreview(candidate))
      .map((candidate) => [candidate.federationId, 'ready' as const]),
  )

  const candidatesToQueue = discoveryCandidates
    .slice(0, previewTargetCount + previewQueueOverscan)
    .filter((candidate) => {
      if (hasCachedPreview(candidate)) {
        return false
      }
      if (queuedIds.has(candidate.federationId)) {
        return false
      }

      const attemptedCreatedAt = previewAttemptedCreatedAt[candidate.federationId]
      return attemptedCreatedAt == null || attemptedCreatedAt < candidate.createdAt
    })

  for (const candidate of candidatesToQueue) {
    queuedIds.add(candidate.federationId)
  }

  return {
    previewQueue: [
      ...nextPreviewQueue,
      ...candidatesToQueue.map((candidate) => candidate.federationId),
    ],
    previewStatusByFederation: {
      ...previewStatusByFederation,
      ...readyStatusUpdates,
    },
  }
}

export function takeNextPreviewCandidate({
  previewQueue,
  discoveryCandidates,
}: {
  previewQueue: string[]
  discoveryCandidates: DiscoveredFederationCandidate[]
}): {
  previewQueue: string[]
  candidate?: DiscoveredFederationCandidate
} {
  const [federationId, ...remainingQueue] = previewQueue
  if (federationId == null || federationId === '') {
    return {
      previewQueue: remainingQueue,
    }
  }

  const candidate = discoveryCandidates.find((item) => item.federationId === federationId)
  return {
    previewQueue: remainingQueue,
    ...(candidate != null ? { candidate } : {}),
  }
}

export async function previewFederationCandidate({
  candidate,
  previewFederation,
  timeoutMs,
}: {
  candidate: DiscoveredFederationCandidate
  previewFederation: (inviteCode: string) => Promise<Federation | undefined>
  timeoutMs: number
}): Promise<PreviewFederationCandidateResult> {
  try {
    const previewResult = await raceWithTimeout(
      previewFederation(candidate.inviteCode),
      timeoutMs,
      PREVIEW_TIMEOUT_TOKEN,
    )

    if (previewResult === PREVIEW_TIMEOUT_TOKEN) {
      return {
        type: 'timed_out',
      }
    }

    if (previewResult == null) {
      return {
        type: 'failed',
        isExpectedError: false,
      }
    }

    if (!doesPreviewMatchCandidate(candidate, previewResult)) {
      return {
        type: 'mismatched',
        federation: previewResult,
      }
    }

    return {
      type: 'ready',
      federation: previewResult,
    }
  } catch (error) {
    return {
      type: 'failed',
      error,
      errorMessage: getErrorMessage(error),
      isExpectedError: isExpectedDiscoveryError(error),
    }
  }
}

export async function waitUntilPreviewQueueIdle({
  isPreviewQueueRunning,
  timeoutMs,
  pollMs,
}: {
  isPreviewQueueRunning: () => boolean
  timeoutMs: number
  pollMs: number
}): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (isPreviewQueueRunning() && Date.now() < deadline) {
    // Allow in-flight preview calls to finish before wallet join/open.
    // eslint-disable-next-line no-await-in-loop
    await new Promise<void>((resolve) => {
      setTimeout(resolve, pollMs)
    })
  }

  return !isPreviewQueueRunning()
}
