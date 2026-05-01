import { isValidNip05, nip19, profileFromEvent, type NDKEvent } from '@nostr-dev-kit/ndk'
import { logger } from 'src/services/logger'
import type { NostrContactSourceType, SyncedNostrContact } from 'src/types/nostr'
import { getErrorMessage } from 'src/utils/error'

export function isValidContactSource(
  sourceType: NostrContactSourceType,
  sourceValue: string,
): boolean {
  if (sourceType === 'nip05') {
    return isValidNip05(sourceValue)
  }

  try {
    const decoded = nip19.decode(sourceValue)
    return decoded.type === 'npub'
  } catch {
    return false
  }
}

export function inferContactSourceType(sourceValue: string): NostrContactSourceType {
  try {
    const decoded = nip19.decode(sourceValue)
    if (decoded.type === 'npub') {
      return 'npub'
    }
  } catch {
    // Fall through to NIP-05 validation for non-npub identifiers.
  }

  return 'nip05'
}

export function getInvalidContactSourceMessage(): string {
  return 'Enter a valid NIP-05 identifier like user@domain.com or a valid npub identifier.'
}

export function getLatestProfileEvents(profileEvents: Set<NDKEvent>): Map<string, NDKEvent> {
  const latestEvents = new Map<string, NDKEvent>()

  for (const event of profileEvents) {
    if (event.pubkey == null || event.pubkey === '') {
      continue
    }

    const existingEvent = latestEvents.get(event.pubkey)
    if (existingEvent == null || (event.created_at ?? 0) > (existingEvent.created_at ?? 0)) {
      latestEvents.set(event.pubkey, event)
    }
  }

  return latestEvents
}

export function mapProfileEventToContact(
  pubkey: string,
  profileEvent: NDKEvent,
): SyncedNostrContact | null {
  try {
    const profile = profileFromEvent(profileEvent)
    const displayName = normalizeOptionalString(profile.displayName)
    const name = normalizeOptionalString(profile.name)
    const nip05 = normalizeOptionalString(profile.nip05)
    const picture = normalizeOptionalString(profile.picture)
    const lud16 = normalizeOptionalString(profile.lud16)
    const lud06 = normalizeOptionalString(profile.lud06)
    const paymentTarget = lud16 ?? lud06

    if (paymentTarget == null) {
      return null
    }

    return {
      pubkey,
      npub: nip19.npubEncode(pubkey),
      ...(displayName != null ? { displayName } : {}),
      ...(name != null ? { name } : {}),
      ...(nip05 != null ? { nip05 } : {}),
      ...(picture != null ? { picture } : {}),
      ...(lud16 != null ? { lud16 } : {}),
      ...(lud06 != null ? { lud06 } : {}),
      paymentTarget,
    }
  } catch (error) {
    logger.nostr.warn('Skipping invalid Nostr profile while syncing contacts', {
      pubkey,
      reason: getErrorMessage(error),
    })
    return null
  }
}

export function compareSyncedContacts(left: SyncedNostrContact, right: SyncedNostrContact): number {
  const leftLabel = getComparableContactLabel(left)
  const rightLabel = getComparableContactLabel(right)

  if (leftLabel === rightLabel) {
    return left.npub.localeCompare(right.npub)
  }

  return leftLabel.localeCompare(rightLabel)
}

export function getContactSearchValues(contact: SyncedNostrContact): string[] {
  return [
    contact.displayName,
    contact.name,
    contact.nip05,
    contact.npub,
    contact.lud16,
    contact.paymentTarget,
  ]
    .map((value) => normalizeContactSearchValue(value))
    .filter((value) => value !== '')
}

export function normalizeContactSearchValue(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLocaleLowerCase() : ''
}

function getComparableContactLabel(contact: SyncedNostrContact): string {
  return normalizeContactSearchValue(
    contact.displayName ?? contact.name ?? contact.nip05 ?? contact.npub,
  )
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}
