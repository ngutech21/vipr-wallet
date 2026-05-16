import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nip19, type NDKEvent } from '@nostr-dev-kit/ndk'
import { Nip87Kinds } from 'src/types/nip87'

import { useNostrStore } from 'src/stores/nostr'

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
    kind: Nip87Kinds.Recommendation,
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

function createProfileEvent(
  pubkey: string,
  createdAt: number,
  profile: Record<string, unknown>,
): NDKEvent {
  const id = `profile-${pubkey}-${createdAt}`
  const content = JSON.stringify(profile)

  return {
    id,
    kind: 0,
    pubkey,
    created_at: createdAt,
    content,
    rawEvent() {
      return {
        id,
        kind: 0,
        pubkey,
        created_at: createdAt,
        content,
        tags: [],
        sig: '',
      }
    },
  } as unknown as NDKEvent
}

const SOURCE_PUBKEY = '1'.repeat(64)
const SOURCE_NPUB = nip19.npubEncode(SOURCE_PUBKEY)
const PAYABLE_LUD16_PUBKEY = '2'.repeat(64)
const PAYABLE_LUD06_PUBKEY = '3'.repeat(64)
const NON_PAYABLE_PUBKEY = '4'.repeat(64)

describe('nostr store discovery queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('starts discovery subscriptions without background previews', async () => {
    const nostr = useNostrStore()
    nostr.ndk = {
      subscribe: vi.fn().mockReturnValue({
        on: vi.fn(),
        stop: vi.fn(),
      }),
    } as unknown as NonNullable<typeof nostr.ndk>
    nostr.discoveryVisibleCount = 15

    await nostr.discoverFederations()

    expect(nostr.discoveryVisibleCount).toBe(5)
  })

  it('prioritizes candidates with higher recommendation counts', () => {
    const nostr = useNostrStore()
    nostr.discoveryCandidates = [
      { federationId: 'fed-older', inviteCode: 'invite-1', createdAt: 10 },
      { federationId: 'fed-newer', inviteCode: 'invite-2', createdAt: 20 },
    ]

    nostr.handleRecommendationEvent(
      createRecommendationEvent({
        pubkey: 'pubkey-a',
        createdAt: 100,
        federationIds: ['fed-older'],
      }),
    )

    expect(nostr.recommendationCountsByFederation['fed-older']).toBe(1)
    expect(nostr.discoveryCandidates[0]?.federationId).toBe('fed-older')
  })

  it('counts unique recommenders without double-counting the same pubkey', () => {
    const nostr = useNostrStore()
    nostr.discoveryCandidates = [{ federationId: 'fed-1', inviteCode: 'invite-1', createdAt: 10 }]

    nostr.handleRecommendationEvent(
      createRecommendationEvent({
        pubkey: 'pubkey-a',
        createdAt: 100,
        federationIds: ['fed-1'],
      }),
    )
    nostr.handleRecommendationEvent(
      createRecommendationEvent({
        pubkey: 'pubkey-a',
        createdAt: 101,
        federationIds: ['fed-1'],
      }),
    )
    nostr.handleRecommendationEvent(
      createRecommendationEvent({
        pubkey: 'pubkey-b',
        createdAt: 102,
        federationIds: ['fed-1'],
      }),
    )

    expect(nostr.recommendationCountsByFederation['fed-1']).toBe(2)
  })

  it('ignores recommendation events when federation pointers are missing', () => {
    const nostr = useNostrStore()
    nostr.discoveryCandidates = [{ federationId: 'fed-2', inviteCode: 'invite-2', createdAt: 10 }]

    nostr.handleRecommendationEvent(
      createRecommendationEvent({
        pubkey: 'pubkey-a',
        createdAt: 100,
        inviteCodes: ['invite-2'],
      }),
    )

    expect(nostr.recommendationCountsByFederation['fed-2']).toBeUndefined()
    expect(nostr.discoveryCandidates[0]?.recommendationCount ?? 0).toBe(0)
  })

  it('maps recommendation pointers to federation ids', () => {
    const nostr = useNostrStore()
    nostr.discoveryCandidates = [{ federationId: 'fed-3', inviteCode: 'invite-3', createdAt: 10 }]

    nostr.handleRecommendationEvent(
      createRecommendationEvent({
        pubkey: 'pubkey-a',
        createdAt: 100,
        federationIds: ['fed-3'],
      }),
    )

    expect(nostr.discoveryCandidates[0]?.recommendationCount).toBe(1)
    expect(nostr.recommendationCountsByFederation['fed-3']).toBe(1)
  })

  it('keeps higher recommendation count when federation event updates candidate metadata', () => {
    const nostr = useNostrStore()
    nostr.discoveryCandidates = [
      { federationId: 'fed-1', inviteCode: 'invite-1', createdAt: 10, recommendationCount: 5 },
    ]

    nostr.handleFederationEvent(
      createFederationEvent({
        federationId: 'fed-1',
        inviteCode: 'invite-1-updated',
        createdAt: 11,
      }),
    )

    expect(nostr.discoveryCandidates[0]?.recommendationCount).toBe(5)
  })

  it('syncs payable contacts from a NIP-05 identifier', async () => {
    const nostr = useNostrStore()
    const followSet = new Set([PAYABLE_LUD16_PUBKEY, PAYABLE_LUD06_PUBKEY, NON_PAYABLE_PUBKEY])
    const fetchUser = vi.fn().mockResolvedValue({
      pubkey: SOURCE_PUBKEY,
      followSet: vi.fn().mockResolvedValue(followSet),
    })
    const fetchEvents = vi.fn().mockResolvedValue(
      new Set([
        createProfileEvent(PAYABLE_LUD16_PUBKEY, 10, {
          display_name: 'Alice',
          lud16: 'alice@getalby.com',
        }),
        createProfileEvent(PAYABLE_LUD06_PUBKEY, 11, {
          name: 'Bob',
          lud06: 'lnurl1dp68gurn8ghj7m',
        }),
        createProfileEvent(NON_PAYABLE_PUBKEY, 12, {
          name: 'Carol',
        }),
      ]),
    )

    nostr.ndk = {
      fetchUser,
      fetchEvents,
    } as unknown as NonNullable<typeof nostr.ndk>
    nostr.setContactSource('alice@example.com')

    await expect(nostr.syncContacts()).resolves.toEqual({
      type: 'success',
      contactCount: 2,
    })

    expect(fetchUser).toHaveBeenCalledWith('alice@example.com')
    expect(fetchEvents).toHaveBeenCalledWith({
      kinds: [0],
      authors: [PAYABLE_LUD16_PUBKEY, PAYABLE_LUD06_PUBKEY, NON_PAYABLE_PUBKEY],
    })
    expect(nostr.contactSource.resolvedPubkey).toBe(SOURCE_PUBKEY)
    expect(nostr.contacts).toHaveLength(2)
    expect(nostr.contacts.map((contact) => contact.paymentTarget)).toEqual([
      'alice@getalby.com',
      'lnurl1dp68gurn8ghj7m',
    ])
    expect(nostr.contacts.find((contact) => contact.pubkey === PAYABLE_LUD16_PUBKEY)?.lud16).toBe(
      'alice@getalby.com',
    )
    expect(nostr.contactSyncMeta.lastSyncedAt).not.toBeNull()
    expect(nostr.contactSyncMeta.lastSyncError).toBeNull()
    expect(nostr.syncStatus).toBe('success')
  })

  it('syncs contacts from an npub source and replaces the stored contacts on re-sync', async () => {
    const nostr = useNostrStore()
    const firstContact = createProfileEvent(PAYABLE_LUD16_PUBKEY, 10, {
      display_name: 'Alice',
      lud16: 'alice@getalby.com',
    })
    const secondContact = createProfileEvent(PAYABLE_LUD06_PUBKEY, 11, {
      display_name: 'Bob',
      lud06: 'lnurl1dp68gurn8ghj7m',
    })
    const followSet = vi
      .fn()
      .mockResolvedValueOnce(new Set([PAYABLE_LUD16_PUBKEY]))
      .mockResolvedValueOnce(new Set([PAYABLE_LUD06_PUBKEY]))
    const fetchUser = vi.fn().mockResolvedValue({
      pubkey: SOURCE_PUBKEY,
      followSet,
    })
    const fetchEvents = vi
      .fn()
      .mockResolvedValueOnce(new Set([firstContact]))
      .mockResolvedValueOnce(new Set([secondContact]))

    nostr.ndk = {
      fetchUser,
      fetchEvents,
    } as unknown as NonNullable<typeof nostr.ndk>
    nostr.contacts = [
      {
        pubkey: NON_PAYABLE_PUBKEY,
        npub: nip19.npubEncode(NON_PAYABLE_PUBKEY),
        paymentTarget: 'stale@getalby.com',
      },
    ]
    nostr.setContactSource(SOURCE_NPUB)

    await expect(nostr.syncContacts()).resolves.toEqual({
      type: 'success',
      contactCount: 1,
    })
    expect(fetchUser).toHaveBeenCalledWith(SOURCE_NPUB)
    expect(nostr.contacts).toHaveLength(1)
    expect(nostr.contacts[0]?.pubkey).toBe(PAYABLE_LUD16_PUBKEY)

    await expect(nostr.syncContacts()).resolves.toEqual({
      type: 'success',
      contactCount: 1,
    })
    expect(nostr.contacts).toHaveLength(1)
    expect(nostr.contacts[0]?.pubkey).toBe(PAYABLE_LUD06_PUBKEY)
  })

  it('does not sync contacts implicitly on store creation', () => {
    const nostr = useNostrStore()

    expect(nostr.contacts).toEqual([])
    expect(nostr.contactSource).toEqual({
      sourceType: 'nip05',
      sourceValue: '',
      resolvedPubkey: null,
    })
    expect(nostr.syncStatus).toBe('idle')
    expect(nostr.contactSyncMeta.lastSyncedAt).toBeNull()
  })

  it('stores sync errors when contact sync fails', async () => {
    const nostr = useNostrStore()
    nostr.ndk = {
      fetchUser: vi.fn().mockRejectedValue(new Error('Relay timeout')),
    } as unknown as NonNullable<typeof nostr.ndk>
    nostr.setContactSource('alice@example.com')

    await expect(nostr.syncContacts()).resolves.toEqual({
      type: 'error',
      message: 'Relay timeout',
    })

    expect(nostr.contacts).toEqual([])
    expect(nostr.contactSyncMeta.lastSyncError).toBe('Relay timeout')
    expect(nostr.syncStatus).toBe('error')
  })
})
