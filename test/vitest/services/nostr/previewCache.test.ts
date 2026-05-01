import { describe, expect, it } from 'vitest'
import type { Federation } from 'src/types/federation'
import type { DiscoveredFederationCandidate } from 'src/services/nostr/discovery'
import {
  createCachedFederationPreview,
  isCachedPreviewValid,
  removeCachedPreview,
  syncDiscoveredFederationsFromCache,
  trimPreviewCache,
} from 'src/services/nostr/previewCache'

const DAY_MS = 24 * 60 * 60 * 1000

function createFederation(id: string, inviteCode: string, title = id): Federation {
  return {
    federationId: id,
    inviteCode,
    title,
    modules: [],
    metadata: {},
  }
}

function createCandidate(
  federationId: string,
  inviteCode: string,
  createdAt: number,
): DiscoveredFederationCandidate {
  return {
    federationId,
    inviteCode,
    createdAt,
  }
}

describe('nostr preview cache service', () => {
  it('creates stable full preview cache entries from candidates and previews', () => {
    const federation = createFederation('fed-1', 'invite-1')

    expect(
      createCachedFederationPreview(createCandidate('fed-1', 'invite-1', 10), federation, 100),
    ).toEqual({
      federation,
      candidateCreatedAt: 10,
      inviteCode: 'invite-1',
      cachedAt: 100,
      completeness: 'full',
    })
  })

  it('validates cached previews against candidate identity and cache age', () => {
    const candidate = createCandidate('fed-1', 'invite-1', 10)
    const cached = createCachedFederationPreview(
      candidate,
      createFederation('fed-1', 'invite-1'),
      100,
    )

    expect(isCachedPreviewValid(cached, candidate, 100 + DAY_MS)).toBe(true)
    expect(isCachedPreviewValid(cached, candidate, 100 + 31 * DAY_MS)).toBe(false)
    expect(isCachedPreviewValid(cached, createCandidate('fed-1', 'invite-2', 10), 100)).toBe(false)
    expect(isCachedPreviewValid(cached, createCandidate('fed-1', 'invite-1', 11), 100)).toBe(false)
    expect(isCachedPreviewValid(cached, createCandidate('fed-2', 'invite-1', 10), 100)).toBe(false)
  })

  it('trims preview caches by newest cached timestamp', () => {
    const cache = {
      'fed-1': createCachedFederationPreview(
        createCandidate('fed-1', 'invite-1', 1),
        createFederation('fed-1', 'invite-1'),
        10,
      ),
      'fed-2': createCachedFederationPreview(
        createCandidate('fed-2', 'invite-2', 2),
        createFederation('fed-2', 'invite-2'),
        30,
      ),
      'fed-3': createCachedFederationPreview(
        createCandidate('fed-3', 'invite-3', 3),
        createFederation('fed-3', 'invite-3'),
        20,
      ),
    }

    expect(Object.keys(trimPreviewCache(cache, 2))).toEqual(['fed-2', 'fed-3'])
    expect(trimPreviewCache(cache, 3)).toBe(cache)
  })

  it('removes cached previews without rewriting unchanged cache objects', () => {
    const cache = {
      'fed-1': createCachedFederationPreview(
        createCandidate('fed-1', 'invite-1', 1),
        createFederation('fed-1', 'invite-1'),
        10,
      ),
    }

    expect(removeCachedPreview(cache, 'fed-2')).toBe(cache)
    expect(removeCachedPreview(cache, 'fed-1')).toEqual({})
  })

  it('syncs valid candidate previews and fresh orphaned previews from cache', () => {
    const now = 1_000 + DAY_MS
    const validCandidate = createCandidate('fed-1', 'invite-1', 10)
    const staleCandidate = createCandidate('fed-2', 'invite-2-new', 20)
    const cache = {
      'fed-1': createCachedFederationPreview(
        validCandidate,
        createFederation('fed-1', 'invite-1', 'Valid'),
        1_000,
      ),
      'fed-2': createCachedFederationPreview(
        createCandidate('fed-2', 'invite-2-old', 20),
        createFederation('fed-2', 'invite-2-old', 'Stale'),
        2_000,
      ),
      'fed-3': createCachedFederationPreview(
        createCandidate('fed-3', 'invite-3', 30),
        createFederation('fed-3', 'invite-3', 'Orphan'),
        3_000,
      ),
      'fed-4': createCachedFederationPreview(
        createCandidate('fed-4', 'invite-4', 40),
        createFederation('fed-4', 'invite-4', 'Expired orphan'),
        now - 31 * DAY_MS,
      ),
    }

    expect(
      syncDiscoveredFederationsFromCache(cache, [validCandidate, staleCandidate], now).map(
        (federation) => federation.federationId,
      ),
    ).toEqual(['fed-3', 'fed-1'])
  })
})
