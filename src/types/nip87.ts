import type { NDKUserProfile, NostrEvent } from '@nostr-dev-kit/ndk'

export enum Nip87Kinds {
  Reccomendation = 38000 as number,
  CashuInfo = 38172 as number,
  FediInfo = 38173 as number,
}

export enum Nip87MintTypes {
  Cashu = 'cashu',
  Fedimint = 'fedimint',
}

export type NostrFederation = {
  federationId: string
  network: string
  inviteCode: string
}

export type Nip87MintInfo = {
  mintUrl?: string
  inviteCodes?: string[]
  appPubkey: string
  rawEvent: NostrEvent
  mintName: string
  relay?: string
  mintPubkey?: string
  supportedNuts?: string
  kind0Metadata?: NDKUserProfile
  numReviews: number
  totalRatings: number
  reviewsWithRating: number
  units: string[]
}

export function isNip87MintInfo(
  mint: Nip87MintInfo | Nip87ReccomendationData,
): mint is Nip87MintInfo {
  return (mint as Nip87MintInfo).appPubkey !== undefined
}

export type Nip87MintReccomendation = {
  mintType: Nip87MintTypes.Cashu | Nip87MintTypes.Fedimint
  mintUrl?: string
  inviteCodes?: string[]
  userPubkey: string
  rawEvent: NostrEvent
  mintName: string
  mintInfoEventRelay?: string
  mintPubkey?: string
  review?: string
  rating?: number
}

export type Nip87ReccomendationData = {
  mintUrl?: string
  supportedNuts: string
  mintName: string
  mintPubkey?: string
  inviteCodes?: string[]
}
