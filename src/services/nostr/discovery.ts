import type { NDKEvent } from '@nostr-dev-kit/ndk'
import type { Federation } from 'src/types/federation'
import { Nip87Kinds } from 'src/types/nip87'
import { getErrorMessage } from 'src/utils/error'

export type DiscoveredFederationCandidate = {
  federationId: string
  inviteCode: string
  createdAt: number
  displayName?: string
  about?: string
  pictureUrl?: string
  network?: string
  recommendationCount?: number
}

export type RecommendationVotersByFederation = Record<string, Record<string, number>>

export type FederationCandidateUpdate = {
  candidates: DiscoveredFederationCandidate[]
  invalidatedFederationId?: string
  shouldRemoveCachedPreview: boolean
}

export type RecommendationStateUpdate = {
  candidates: DiscoveredFederationCandidate[]
  recommendationCountsByFederation: Record<string, number>
  recommendationVotersByFederation: RecommendationVotersByFederation
  lastRecommendationCreatedAt: number
}

const EXPECTED_DISCOVERY_ERROR_PATTERNS = [
  /failed to download client config/i,
  /failed to fetch/i,
  /networkerror/i,
  /load failed/i,
  /connection timeout/i,
  /security error when calling getdirectory/i,
  /securityerror.*getdirectory/i,
  /operation is insecure/i,
]

export function extractFederationCandidate(event: NDKEvent): DiscoveredFederationCandidate | null {
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

  const summary = extractCandidateSummary(event)

  return {
    federationId,
    inviteCode,
    createdAt: event.created_at ?? 0,
    ...(summary.displayName != null ? { displayName: summary.displayName } : {}),
    ...(summary.about != null ? { about: summary.about } : {}),
    ...(summary.pictureUrl != null ? { pictureUrl: summary.pictureUrl } : {}),
    ...(summary.network != null ? { network: summary.network } : {}),
  }
}

export function extractRecommendationTargets(event: NDKEvent): string[] {
  const recommendedFederationIds = new Set<string>()

  for (const pointerTag of event.getMatchingTags('a')) {
    const pointer = pointerTag[1]
    if (pointer == null || pointer === '') {
      continue
    }

    const [kind, _pubkey, identifier] = pointer.split(':', 3)
    if (kind !== String(Nip87Kinds.FediInfo) || identifier == null || identifier === '') {
      continue
    }

    recommendedFederationIds.add(identifier)
  }

  const directFederationIds = event
    .getMatchingTags('d')
    .map((tag) => tag[1])
    .filter((federationId): federationId is string => federationId != null && federationId !== '')
  for (const federationId of directFederationIds) {
    recommendedFederationIds.add(federationId)
  }

  return [...recommendedFederationIds]
}

export function isExpectedDiscoveryError(error: unknown): boolean {
  const message = getErrorMessage(error).trim()
  if (message === '') {
    return false
  }

  return EXPECTED_DISCOVERY_ERROR_PATTERNS.some((pattern) => pattern.test(message))
}

export function doesPreviewMatchCandidate(
  candidate: DiscoveredFederationCandidate,
  federation: Federation,
): boolean {
  return federation.federationId === candidate.federationId
}

export function applyFederationCandidateToDiscoveryState({
  candidates,
  candidate,
  recommendationCountsByFederation,
  maxCandidates,
}: {
  candidates: DiscoveredFederationCandidate[]
  candidate: DiscoveredFederationCandidate
  recommendationCountsByFederation: Record<string, number>
  maxCandidates: number
}): FederationCandidateUpdate {
  const existing = candidates.find((item) => item.federationId === candidate.federationId)
  const recommendationCount = recommendationCountsByFederation[candidate.federationId] ?? 0

  if (existing == null) {
    return {
      candidates: limitDiscoveryCandidates(
        sortDiscoveredFederationCandidates([
          ...candidates,
          {
            ...candidate,
            recommendationCount,
          },
        ]),
        maxCandidates,
      ),
      invalidatedFederationId: candidate.federationId,
      shouldRemoveCachedPreview: false,
    }
  }

  if (existing.inviteCode === candidate.inviteCode && existing.createdAt === candidate.createdAt) {
    return {
      candidates,
      shouldRemoveCachedPreview: false,
    }
  }

  return {
    candidates: limitDiscoveryCandidates(
      sortDiscoveredFederationCandidates(
        candidates.map((item) =>
          item.federationId === candidate.federationId
            ? {
                ...candidate,
                recommendationCount: Math.max(
                  existing.recommendationCount ?? 0,
                  recommendationCount,
                ),
              }
            : item,
        ),
      ),
      maxCandidates,
    ),
    invalidatedFederationId: candidate.federationId,
    shouldRemoveCachedPreview: true,
  }
}

export function applyRecommendationTargetsToDiscoveryState({
  candidates,
  recommendationCountsByFederation,
  recommendationVotersByFederation,
  lastRecommendationCreatedAt,
  pubkey,
  createdAt,
  federationIds,
}: {
  candidates: DiscoveredFederationCandidate[]
  recommendationCountsByFederation: Record<string, number>
  recommendationVotersByFederation: RecommendationVotersByFederation
  lastRecommendationCreatedAt: number
  pubkey: string
  createdAt: number
  federationIds: string[]
}): RecommendationStateUpdate {
  const nextRecommendationVotersByFederation = { ...recommendationVotersByFederation }
  let nextRecommendationCountsByFederation = recommendationCountsByFederation
  let recommendationCountsChanged = false

  for (const federationId of federationIds) {
    const votersByFederation = nextRecommendationVotersByFederation[federationId] ?? {}
    const previousVoteCreatedAt = votersByFederation[pubkey]
    if (previousVoteCreatedAt != null && previousVoteCreatedAt >= createdAt) {
      continue
    }

    const nextVotersByFederation = {
      ...votersByFederation,
      [pubkey]: createdAt,
    }
    nextRecommendationVotersByFederation[federationId] = nextVotersByFederation

    const recommendationCount = Object.keys(nextVotersByFederation).length
    if (nextRecommendationCountsByFederation[federationId] !== recommendationCount) {
      if (!recommendationCountsChanged) {
        nextRecommendationCountsByFederation = { ...recommendationCountsByFederation }
        recommendationCountsChanged = true
      }
      nextRecommendationCountsByFederation[federationId] = recommendationCount
    }
  }

  return {
    candidates: recommendationCountsChanged
      ? sortDiscoveredFederationCandidates(
          applyRecommendationCountsToDiscoveryCandidates(
            candidates,
            nextRecommendationCountsByFederation,
          ),
        )
      : candidates,
    recommendationCountsByFederation: nextRecommendationCountsByFederation,
    recommendationVotersByFederation: nextRecommendationVotersByFederation,
    lastRecommendationCreatedAt: Math.max(lastRecommendationCreatedAt, createdAt),
  }
}

export function applyRecommendationCountsToDiscoveryCandidates(
  candidates: DiscoveredFederationCandidate[],
  recommendationCountsByFederation: Record<string, number>,
): DiscoveredFederationCandidate[] {
  return candidates.map((candidate) => {
    const recommendationCount = recommendationCountsByFederation[candidate.federationId] ?? 0
    return {
      ...candidate,
      recommendationCount: Math.max(candidate.recommendationCount ?? 0, recommendationCount),
    }
  })
}

export function sortDiscoveredFederationCandidates(
  candidates: DiscoveredFederationCandidate[],
): DiscoveredFederationCandidate[] {
  return [...candidates].sort((left, right) => {
    const recommendationDiff = (right.recommendationCount ?? 0) - (left.recommendationCount ?? 0)
    if (recommendationDiff !== 0) {
      return recommendationDiff
    }

    return right.createdAt - left.createdAt
  })
}

function limitDiscoveryCandidates(
  candidates: DiscoveredFederationCandidate[],
  maxCandidates: number,
): DiscoveredFederationCandidate[] {
  return candidates.length > maxCandidates ? candidates.slice(0, maxCandidates) : candidates
}

function extractCandidateSummary(
  event: NDKEvent,
): Pick<DiscoveredFederationCandidate, 'displayName' | 'about' | 'pictureUrl' | 'network'> {
  const content =
    typeof event.content === 'string' && event.content.trim() !== ''
      ? safeJsonParse(event.content)
      : undefined

  const networkTag = event
    .getMatchingTags('n')
    .map((tag) => tag[1])
    .find((value): value is string => typeof value === 'string' && value.trim() !== '')

  const displayName = getStringValue(content, ['name', 'federation_name'])
  const about = getStringValue(content, ['about', 'description'])
  const pictureUrl = getStringValue(content, [
    'picture',
    'image',
    'icon',
    'icon_url',
    'picture_url',
    'federation_icon_url',
  ])
  const network = networkTag ?? getStringValue(content, ['network'])

  return {
    ...(displayName != null ? { displayName } : {}),
    ...(about != null ? { about } : {}),
    ...(pictureUrl != null ? { pictureUrl } : {}),
    ...(network != null ? { network } : {}),
  }
}

function safeJsonParse(value: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(value) as unknown
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : undefined
  } catch {
    return undefined
  }
}

function getStringValue(
  content: Record<string, unknown> | undefined,
  keys: string[],
): string | undefined {
  if (content == null) {
    return undefined
  }

  for (const key of keys) {
    const value = content[key]
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim()
    }
  }

  return undefined
}
