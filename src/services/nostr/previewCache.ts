import type { Federation } from 'src/types/federation'
import type { DiscoveredFederationCandidate } from 'src/services/nostr/discovery'

const PREVIEW_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

export type CachedFederationPreview = {
  federation: Federation
  candidateCreatedAt: number
  inviteCode: string
  cachedAt: number
  completeness: 'full'
}

export function createCachedFederationPreview(
  candidate: DiscoveredFederationCandidate,
  federation: Federation,
  cachedAt = Date.now(),
): CachedFederationPreview {
  return {
    federation,
    candidateCreatedAt: candidate.createdAt,
    inviteCode: candidate.inviteCode,
    cachedAt,
    completeness: 'full',
  }
}

export function isPreviewCacheExpired(cached: CachedFederationPreview, now = Date.now()): boolean {
  return now - cached.cachedAt > PREVIEW_CACHE_MAX_AGE_MS
}

export function isCachedPreviewValid(
  cached: CachedFederationPreview | undefined,
  candidate: DiscoveredFederationCandidate,
  now = Date.now(),
): cached is CachedFederationPreview {
  if (cached == null) {
    return false
  }

  if (cached.completeness !== 'full') {
    return false
  }

  if (isPreviewCacheExpired(cached, now)) {
    return false
  }

  return (
    cached.federation.federationId === candidate.federationId &&
    cached.inviteCode === candidate.inviteCode &&
    cached.candidateCreatedAt === candidate.createdAt
  )
}

export function trimPreviewCache(
  previewCacheByFederation: Record<string, CachedFederationPreview>,
  maxSize: number,
): Record<string, CachedFederationPreview> {
  const entries = Object.entries(previewCacheByFederation)
  if (entries.length <= maxSize) {
    return previewCacheByFederation
  }

  return Object.fromEntries(
    entries.sort(([, left], [, right]) => right.cachedAt - left.cachedAt).slice(0, maxSize),
  )
}

export function removeCachedPreview(
  previewCacheByFederation: Record<string, CachedFederationPreview>,
  federationId: string,
): Record<string, CachedFederationPreview> {
  if (!(federationId in previewCacheByFederation)) {
    return previewCacheByFederation
  }

  const { [federationId]: _removed, ...remaining } = previewCacheByFederation
  return remaining
}

export function syncDiscoveredFederationsFromCache(
  previewCacheByFederation: Record<string, CachedFederationPreview>,
  discoveryCandidates: DiscoveredFederationCandidate[],
  now = Date.now(),
): Federation[] {
  const validEntries = discoveryCandidates
    .map((candidate) => {
      const cached = previewCacheByFederation[candidate.federationId]
      if (!isCachedPreviewValid(cached, candidate, now)) {
        return undefined
      }

      return cached
    })
    .filter((cached): cached is CachedFederationPreview => cached != null)

  const remainingEntries = Object.entries(previewCacheByFederation)
    .filter(([federationId, cached]) => {
      const candidate = discoveryCandidates.find((item) => item.federationId === federationId)
      return candidate == null && !isPreviewCacheExpired(cached, now)
    })
    .map(([, cached]) => cached)

  const deduped = [...validEntries, ...remainingEntries]
  const seenIds = new Set<string>()
  return deduped
    .filter((cached) => {
      const federationId = cached.federation.federationId
      if (seenIds.has(federationId)) {
        return false
      }
      seenIds.add(federationId)
      return true
    })
    .sort((left, right) => right.cachedAt - left.cachedAt)
    .map((cached) => cached.federation)
}
