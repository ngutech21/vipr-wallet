import { describe, expect, it } from 'vitest'
import { nip19, type NDKEvent } from '@nostr-dev-kit/ndk'
import {
  compareSyncedContacts,
  getContactSearchValues,
  getLatestProfileEvents,
  getInvalidContactSourceMessage,
  inferContactSourceType,
  isValidContactSource,
  mapProfileEventToContact,
  normalizeContactSearchValue,
} from 'src/services/nostr/contacts'
import type { SyncedNostrContact } from 'src/types/nostr'

const SOURCE_PUBKEY = '1'.repeat(64)
const SOURCE_NPUB = nip19.npubEncode(SOURCE_PUBKEY)
const LUD16_PUBKEY = '2'.repeat(64)
const LUD06_PUBKEY = '3'.repeat(64)
const NON_PAYABLE_PUBKEY = '4'.repeat(64)

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

function createContact(overrides: Partial<SyncedNostrContact>): SyncedNostrContact {
  return {
    pubkey: 'f'.repeat(64),
    npub: nip19.npubEncode('f'.repeat(64)),
    paymentTarget: 'fallback@example.com',
    ...overrides,
  }
}

describe('nostr contacts service', () => {
  it('validates and infers supported contact source types', () => {
    expect(inferContactSourceType(SOURCE_NPUB)).toBe('npub')
    expect(inferContactSourceType('alice@example.com')).toBe('nip05')

    expect(isValidContactSource('npub', SOURCE_NPUB)).toBe(true)
    expect(isValidContactSource('npub', 'alice@example.com')).toBe(false)
    expect(isValidContactSource('nip05', 'alice@example.com')).toBe(true)
    expect(isValidContactSource('nip05', 'not a nip05')).toBe(false)
    expect(getInvalidContactSourceMessage()).toContain('NIP-05')
  })

  it('keeps only the latest profile event per pubkey', () => {
    const older = createProfileEvent(LUD16_PUBKEY, 10, { lud16: 'old@example.com' })
    const newer = createProfileEvent(LUD16_PUBKEY, 20, { lud16: 'new@example.com' })
    const other = createProfileEvent(LUD06_PUBKEY, 15, { lud06: 'lnurl1abc' })
    const missingPubkey = {
      created_at: 30,
    } as unknown as NDKEvent

    const latest = getLatestProfileEvents(new Set([older, newer, other, missingPubkey]))

    expect(latest.size).toBe(2)
    expect(latest.get(LUD16_PUBKEY)).toBe(newer)
    expect(latest.get(LUD06_PUBKEY)).toBe(other)
  })

  it('maps payable profile events to synced contacts', () => {
    const contact = mapProfileEventToContact(
      LUD16_PUBKEY,
      createProfileEvent(LUD16_PUBKEY, 10, {
        display_name: '  Alice  ',
        name: 'alice',
        nip05: 'alice@example.com',
        picture: 'https://example.com/alice.png',
        lud16: ' alice@example.com ',
      }),
    )

    expect(contact).toEqual({
      pubkey: LUD16_PUBKEY,
      npub: nip19.npubEncode(LUD16_PUBKEY),
      displayName: 'Alice',
      name: 'alice',
      nip05: 'alice@example.com',
      picture: 'https://example.com/alice.png',
      lud16: 'alice@example.com',
      paymentTarget: 'alice@example.com',
    })

    expect(
      mapProfileEventToContact(
        LUD06_PUBKEY,
        createProfileEvent(LUD06_PUBKEY, 10, {
          name: 'bob',
          lud06: ' lnurl1abc ',
        }),
      )?.paymentTarget,
    ).toBe('lnurl1abc')
    expect(
      mapProfileEventToContact(
        NON_PAYABLE_PUBKEY,
        createProfileEvent(NON_PAYABLE_PUBKEY, 10, { name: 'no payment target' }),
      ),
    ).toBeNull()
  })

  it('sorts contacts by visible label and falls back to npub', () => {
    const alice = createContact({
      displayName: 'Alice',
      npub: nip19.npubEncode('a'.repeat(64)),
    })
    const bob = createContact({
      displayName: 'Bob',
      npub: nip19.npubEncode('b'.repeat(64)),
    })
    const aliceLaterNpub = createContact({
      displayName: 'Alice',
      npub: nip19.npubEncode('c'.repeat(64)),
    })

    expect([bob, aliceLaterNpub, alice].sort(compareSyncedContacts)).toEqual([
      alice,
      aliceLaterNpub,
      bob,
    ])
  })

  it('normalizes contact search values', () => {
    const contact = createContact({
      displayName: ' Alice ',
      name: 'alice',
      nip05: 'ALICE@EXAMPLE.COM',
      lud16: ' alice@example.com ',
      paymentTarget: 'alice@example.com',
    })

    expect(normalizeContactSearchValue('  MiXeD  ')).toBe('mixed')
    expect(normalizeContactSearchValue(null)).toBe('')
    expect(getContactSearchValues(contact)).toEqual([
      'alice',
      'alice',
      'alice@example.com',
      contact.npub,
      'alice@example.com',
      'alice@example.com',
    ])
  })
})
