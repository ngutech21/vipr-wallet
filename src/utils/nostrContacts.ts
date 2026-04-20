import type { SyncedNostrContact } from 'src/types/nostr'

export function getNostrContactDisplayName(contact: SyncedNostrContact): string {
  return contact.displayName ?? contact.name ?? contact.nip05 ?? truncateNpub(contact.npub)
}

export function getNostrContactSubtitle(contact: SyncedNostrContact): string {
  return contact.lud16 ?? 'LNURL'
}

export function truncateNpub(npub: string): string {
  if (npub.length <= 16) {
    return npub
  }

  return `${npub.slice(0, 8)}...${npub.slice(-8)}`
}
