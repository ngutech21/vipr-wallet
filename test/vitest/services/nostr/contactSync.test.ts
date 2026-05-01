import { describe, expect, it, vi } from 'vitest'
import { nip19, type NDKEvent, type NDKFilter } from '@nostr-dev-kit/ndk'
import { syncNostrContacts } from 'src/services/nostr/contactSync'
import type { NostrNdkClient } from 'src/services/nostr/subscriptions'

const SOURCE_PUBKEY = '1'.repeat(64)
const ALICE_PUBKEY = '2'.repeat(64)
const BOB_PUBKEY = '3'.repeat(64)
const NO_PAYMENT_PUBKEY = '4'.repeat(64)

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

function createNdkClient({
  followedPubkeys = [],
  profileEvents = new Set<NDKEvent>(),
  sourcePubkey = SOURCE_PUBKEY,
  sourceFound = true,
}: {
  followedPubkeys?: string[]
  profileEvents?: Set<NDKEvent>
  sourcePubkey?: string
  sourceFound?: boolean
} = {}): NostrNdkClient {
  return {
    explicitRelayUrls: ['wss://relay.example'],
    pool: {
      on: vi.fn(),
    },
    connect: vi.fn(() => Promise.resolve()),
    subscribe: vi.fn(() => ({
      on: vi.fn(),
      stop: vi.fn(),
    })),
    fetchUser: vi.fn(() =>
      Promise.resolve(
        sourceFound
          ? {
              pubkey: sourcePubkey,
              followSet: () => Promise.resolve(new Set(followedPubkeys)),
            }
          : null,
      ),
    ),
    fetchEvents: vi.fn((_filter: NDKFilter) => Promise.resolve(profileEvents)),
  }
}

describe('nostr contact sync service', () => {
  it('resolves the source user and maps payable followed profiles', async () => {
    const ndk = createNdkClient({
      followedPubkeys: [BOB_PUBKEY, ALICE_PUBKEY, NO_PAYMENT_PUBKEY],
      profileEvents: new Set([
        createProfileEvent(ALICE_PUBKEY, 10, {
          display_name: 'Alice Old',
          lud16: 'old@example.com',
        }),
        createProfileEvent(ALICE_PUBKEY, 20, {
          display_name: 'Alice',
          lud16: 'alice@example.com',
        }),
        createProfileEvent(BOB_PUBKEY, 15, {
          name: 'Bob',
          lud06: 'lnurl1bob',
        }),
        createProfileEvent(NO_PAYMENT_PUBKEY, 15, {
          name: 'No Payment',
        }),
      ]),
    })

    await expect(syncNostrContacts(ndk, 'alice@example.com')).resolves.toEqual({
      resolvedPubkey: SOURCE_PUBKEY,
      contacts: [
        {
          pubkey: ALICE_PUBKEY,
          npub: nip19.npubEncode(ALICE_PUBKEY),
          displayName: 'Alice',
          lud16: 'alice@example.com',
          paymentTarget: 'alice@example.com',
        },
        {
          pubkey: BOB_PUBKEY,
          npub: nip19.npubEncode(BOB_PUBKEY),
          name: 'Bob',
          lud06: 'lnurl1bob',
          paymentTarget: 'lnurl1bob',
        },
      ],
    })
    expect(ndk.fetchUser).toHaveBeenCalledWith('alice@example.com')
    expect(ndk.fetchEvents).toHaveBeenCalledWith({
      kinds: [0],
      authors: [BOB_PUBKEY, ALICE_PUBKEY, NO_PAYMENT_PUBKEY],
    })
  })

  it('does not fetch profile events when the source follows nobody', async () => {
    const ndk = createNdkClient()

    await expect(syncNostrContacts(ndk, 'alice@example.com')).resolves.toEqual({
      resolvedPubkey: SOURCE_PUBKEY,
      contacts: [],
    })
    expect(ndk.fetchEvents).not.toHaveBeenCalled()
  })

  it('fails when the source user cannot be resolved', async () => {
    const ndk = createNdkClient({ sourceFound: false })

    await expect(syncNostrContacts(ndk, 'missing@example.com')).rejects.toThrow(
      'Nostr user not found',
    )
  })
})
