import { describe, expect, it } from 'vitest'
import {
  getNostrContactDisplayName,
  getNostrContactSubtitle,
  truncateNpub,
} from 'src/utils/nostrContacts'
import type { SyncedNostrContact } from 'src/types/nostr'

function createContact(overrides: Partial<SyncedNostrContact> = {}): SyncedNostrContact {
  return {
    pubkey: 'a'.repeat(64),
    npub: 'npub1234567890abcdef',
    paymentTarget: 'alice@example.com',
    ...overrides,
  }
}

describe('nostrContacts', () => {
  it('uses the strongest available display identity', () => {
    expect(
      getNostrContactDisplayName(
        createContact({
          displayName: 'Alice Display',
          name: 'Alice Name',
          nip05: 'alice@example.com',
        }),
      ),
    ).toBe('Alice Display')
  })

  it('falls back past empty profile names', () => {
    expect(
      getNostrContactDisplayName(
        createContact({
          displayName: '',
          name: '   ',
          nip05: 'alice@example.com',
        }),
      ),
    ).toBe('alice@example.com')
  })

  it('falls back to a truncated npub when profile labels are missing', () => {
    expect(getNostrContactDisplayName(createContact())).toBe('npub1234...90abcdef')
  })

  it('uses lud16 as subtitle and falls back when it is blank', () => {
    expect(getNostrContactSubtitle(createContact({ lud16: 'alice@getalby.com' }))).toBe(
      'alice@getalby.com',
    )
    expect(getNostrContactSubtitle(createContact({ lud16: '   ' }))).toBe('LNURL')
  })

  it('does not truncate short npubs', () => {
    expect(truncateNpub('npub1short')).toBe('npub1short')
  })
})
