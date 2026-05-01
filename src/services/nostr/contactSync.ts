import type { NDKEvent } from '@nostr-dev-kit/ndk'
import type { SyncedNostrContact } from 'src/types/nostr'
import {
  compareSyncedContacts,
  getLatestProfileEvents,
  mapProfileEventToContact,
} from 'src/services/nostr/contacts'
import type { NostrNdkClient } from 'src/services/nostr/subscriptions'

export type SyncedNostrContactsResult = {
  resolvedPubkey: string
  contacts: SyncedNostrContact[]
}

export async function syncNostrContacts(
  ndk: NostrNdkClient,
  sourceValue: string,
): Promise<SyncedNostrContactsResult> {
  const sourceUser = await ndk.fetchUser(sourceValue)
  if (sourceUser == null) {
    throw new Error('Nostr user not found')
  }

  const followedPubkeys = Array.from(await sourceUser.followSet())
  const profileEvents =
    followedPubkeys.length > 0
      ? await ndk.fetchEvents({ kinds: [0], authors: followedPubkeys })
      : new Set<NDKEvent>()
  const latestProfileEvents = getLatestProfileEvents(profileEvents)
  const contacts = followedPubkeys
    .map((pubkey) => {
      const profileEvent = latestProfileEvents.get(pubkey)
      if (profileEvent == null) {
        return null
      }

      return mapProfileEventToContact(pubkey, profileEvent)
    })
    .filter((contact): contact is SyncedNostrContact => contact != null)
    .sort(compareSyncedContacts)

  return {
    resolvedPubkey: sourceUser.pubkey,
    contacts,
  }
}
