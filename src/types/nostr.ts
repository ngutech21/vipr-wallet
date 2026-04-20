export type NostrContactSourceType = 'nip05' | 'npub'

export type NostrContactSyncStatus = 'idle' | 'syncing' | 'success' | 'error'

export interface NostrContactSource {
  sourceType: NostrContactSourceType
  sourceValue: string
  resolvedPubkey: string | null
}

export interface NostrContactSyncMeta {
  lastSyncedAt: number | null
  lastSyncError: string | null
}

export interface SyncedNostrContact {
  pubkey: string
  npub: string
  displayName?: string
  name?: string
  nip05?: string
  picture?: string
  lud16?: string
  lud06?: string
  paymentTarget: string
}
