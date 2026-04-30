import { describe, expect, it } from 'vitest'
import type { NDKEvent } from '@nostr-dev-kit/ndk'
import { Nip87Kinds } from 'src/types/nip87'
import type { Federation } from 'src/types/federation'
import {
  doesPreviewMatchCandidate,
  extractFederationCandidate,
  extractRecommendationTargets,
  isExpectedDiscoveryError,
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
})
