import { describe, expect, it } from 'vitest'
import type { NDKEvent } from '@nostr-dev-kit/ndk'
import { Nip87Kinds } from 'src/types/nip87'
import type { Federation } from 'src/types/federation'
import {
  applyFederationCandidateToDiscoveryState,
  applyRecommendationCountsToDiscoveryCandidates,
  applyRecommendationTargetsToDiscoveryState,
  doesPreviewMatchCandidate,
  extractFederationCandidate,
  extractRecommendationTargets,
  isExpectedDiscoveryError,
  sortDiscoveredFederationCandidates,
  type DiscoveredFederationCandidate,
} from 'src/services/nostr/discovery'

type TagMap = Record<string, string[][]>

function createEvent({
  createdAt = 10,
  content = '',
  tags = {},
}: {
  createdAt?: number
  content?: string
  tags?: TagMap
}): NDKEvent {
  return {
    id: `event-${createdAt}`,
    kind: Nip87Kinds.FediInfo,
    created_at: createdAt,
    content,
    getMatchingTags(tag: string) {
      return tags[tag] ?? []
    },
  } as unknown as NDKEvent
}

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

describe('nostr discovery service', () => {
  it('extracts federation candidates with summary metadata', () => {
    const candidate = extractFederationCandidate(
      createEvent({
        createdAt: 42,
        content: JSON.stringify({
          name: '  Federation One  ',
          about: '  Private ecash  ',
          picture: '  https://example.com/icon.png  ',
          network: 'mainnet',
        }),
        tags: {
          d: [['d', 'fed-1']],
          u: [['u', 'fed11invite']],
          n: [['n', 'signet']],
        },
      }),
    )

    expect(candidate).toEqual({
      federationId: 'fed-1',
      inviteCode: 'fed11invite',
      createdAt: 42,
      displayName: 'Federation One',
      about: 'Private ecash',
      pictureUrl: 'https://example.com/icon.png',
      network: 'signet',
    })
  })

  it('ignores federation candidates without stable ids or invite codes', () => {
    expect(
      extractFederationCandidate(
        createEvent({
          tags: {
            d: [['d', 'fed-1']],
          },
        }),
      ),
    ).toBeNull()
    expect(
      extractFederationCandidate(
        createEvent({
          tags: {
            u: [['u', 'fed11invite']],
          },
        }),
      ),
    ).toBeNull()
  })

  it('extracts unique recommendation targets from address and direct tags', () => {
    const targets = extractRecommendationTargets(
      createEvent({
        tags: {
          a: [
            ['a', `${Nip87Kinds.FediInfo}:pubkey:fed-1`],
            ['a', `${Nip87Kinds.FediInfo}:pubkey:fed-1`],
            ['a', '0:pubkey:profile-event'],
            ['a', `${Nip87Kinds.FediInfo}:pubkey:`],
          ],
          d: [
            ['d', 'fed-2'],
            ['d', 'fed-1'],
            ['d', ''],
          ],
        },
      }),
    )

    expect(targets).toEqual(['fed-1', 'fed-2'])
  })

  it('classifies expected discovery errors without hiding unrelated failures', () => {
    expect(isExpectedDiscoveryError(new Error('Failed to fetch'))).toBe(true)
    expect(isExpectedDiscoveryError('SecurityError when calling getDirectory')).toBe(true)
    expect(isExpectedDiscoveryError(new Error('invalid federation response'))).toBe(false)
    expect(isExpectedDiscoveryError('')).toBe(false)
  })

  it('matches previews by federation id only', () => {
    const federation: Federation = {
      federationId: 'fed-1',
      inviteCode: 'invite-from-preview',
      title: 'Preview',
      modules: [],
    }

    expect(
      doesPreviewMatchCandidate(
        { federationId: 'fed-1', inviteCode: 'invite-from-event', createdAt: 1 },
        federation,
      ),
    ).toBe(true)
    expect(
      doesPreviewMatchCandidate(
        { federationId: 'fed-2', inviteCode: 'invite-from-preview', createdAt: 1 },
        federation,
      ),
    ).toBe(false)
  })

  it('adds new federation candidates immutably with recommendation counts', () => {
    const existing = [createCandidate('fed-old', 10)]

    const update = applyFederationCandidateToDiscoveryState({
      candidates: existing,
      candidate: createCandidate('fed-new', 20),
      recommendationCountsByFederation: {
        'fed-new': 3,
      },
      maxCandidates: 10,
    })

    expect(existing).toEqual([createCandidate('fed-old', 10)])
    expect(update).toEqual({
      candidates: [
        { ...createCandidate('fed-new', 20), recommendationCount: 3 },
        createCandidate('fed-old', 10),
      ],
      invalidatedFederationId: 'fed-new',
      shouldRemoveCachedPreview: false,
    })
  })

  it('updates changed federation candidates and preserves higher existing recommendation counts', () => {
    const update = applyFederationCandidateToDiscoveryState({
      candidates: [{ ...createCandidate('fed-1', 10), recommendationCount: 5 }],
      candidate: {
        ...createCandidate('fed-1', 11),
        inviteCode: 'invite-fed-1-updated',
      },
      recommendationCountsByFederation: {
        'fed-1': 2,
      },
      maxCandidates: 10,
    })

    expect(update).toEqual({
      candidates: [
        {
          federationId: 'fed-1',
          inviteCode: 'invite-fed-1-updated',
          createdAt: 11,
          recommendationCount: 5,
        },
      ],
      invalidatedFederationId: 'fed-1',
      shouldRemoveCachedPreview: true,
    })
  })

  it('leaves unchanged federation candidates untouched', () => {
    const candidates = [createCandidate('fed-1', 10)]

    expect(
      applyFederationCandidateToDiscoveryState({
        candidates,
        candidate: createCandidate('fed-1', 10),
        recommendationCountsByFederation: {},
        maxCandidates: 10,
      }),
    ).toEqual({
      candidates,
      shouldRemoveCachedPreview: false,
    })
  })

  it('limits federation candidates after sorting', () => {
    expect(
      applyFederationCandidateToDiscoveryState({
        candidates: [createCandidate('fed-1', 10), createCandidate('fed-2', 20)],
        candidate: createCandidate('fed-3', 30),
        recommendationCountsByFederation: {},
        maxCandidates: 2,
      }).candidates.map((candidate) => candidate.federationId),
    ).toEqual(['fed-3', 'fed-2'])
  })

  it('applies recommendation targets without mutating voter state', () => {
    const candidates = [createCandidate('fed-1', 10), createCandidate('fed-2', 20)]
    const voters = {
      'fed-1': {
        voter1: 5,
      },
    }

    const update = applyRecommendationTargetsToDiscoveryState({
      candidates,
      recommendationCountsByFederation: {
        'fed-1': 1,
      },
      recommendationVotersByFederation: voters,
      lastRecommendationCreatedAt: 5,
      pubkey: 'voter2',
      createdAt: 30,
      federationIds: ['fed-1', 'fed-2'],
    })

    expect(voters).toEqual({
      'fed-1': {
        voter1: 5,
      },
    })
    expect(update.lastRecommendationCreatedAt).toBe(30)
    expect(update.recommendationCountsByFederation).toEqual({
      'fed-1': 2,
      'fed-2': 1,
    })
    expect(update.recommendationVotersByFederation).toEqual({
      'fed-1': {
        voter1: 5,
        voter2: 30,
      },
      'fed-2': {
        voter2: 30,
      },
    })
    expect(update.candidates.map((candidate) => candidate.federationId)).toEqual(['fed-1', 'fed-2'])
    expect(update.candidates.map((candidate) => candidate.recommendationCount)).toEqual([2, 1])
  })

  it('updates newer votes from the same voter without recomputing candidate counts', () => {
    const candidates = [{ ...createCandidate('fed-1', 10), recommendationCount: 1 }]

    const update = applyRecommendationTargetsToDiscoveryState({
      candidates,
      recommendationCountsByFederation: {
        'fed-1': 1,
      },
      recommendationVotersByFederation: {
        'fed-1': {
          voter1: 5,
        },
      },
      lastRecommendationCreatedAt: 5,
      pubkey: 'voter1',
      createdAt: 6,
      federationIds: ['fed-1'],
    })

    expect(update.candidates).toBe(candidates)
    expect(update.recommendationCountsByFederation).toEqual({
      'fed-1': 1,
    })
    expect(update.recommendationVotersByFederation).toEqual({
      'fed-1': {
        voter1: 6,
      },
    })
  })

  it('ignores older duplicate recommendation votes', () => {
    const candidates = [{ ...createCandidate('fed-1', 10), recommendationCount: 1 }]

    const update = applyRecommendationTargetsToDiscoveryState({
      candidates,
      recommendationCountsByFederation: {
        'fed-1': 1,
      },
      recommendationVotersByFederation: {
        'fed-1': {
          voter1: 7,
        },
      },
      lastRecommendationCreatedAt: 7,
      pubkey: 'voter1',
      createdAt: 6,
      federationIds: ['fed-1'],
    })

    expect(update.candidates).toBe(candidates)
    expect(update.recommendationVotersByFederation).toEqual({
      'fed-1': {
        voter1: 7,
      },
    })
  })

  it('sorts candidates by recommendation count and then created time', () => {
    expect(
      sortDiscoveredFederationCandidates([
        { ...createCandidate('fed-1', 30), recommendationCount: 1 },
        { ...createCandidate('fed-2', 10), recommendationCount: 2 },
        { ...createCandidate('fed-3', 20), recommendationCount: 2 },
      ]).map((candidate) => candidate.federationId),
    ).toEqual(['fed-3', 'fed-2', 'fed-1'])
  })

  it('applies recommendation counts while preserving higher candidate counts', () => {
    expect(
      applyRecommendationCountsToDiscoveryCandidates(
        [{ ...createCandidate('fed-1', 10), recommendationCount: 5 }, createCandidate('fed-2', 20)],
        {
          'fed-1': 2,
          'fed-2': 3,
        },
      ),
    ).toEqual([
      { ...createCandidate('fed-1', 10), recommendationCount: 5 },
      { ...createCandidate('fed-2', 20), recommendationCount: 3 },
    ])
  })
})
