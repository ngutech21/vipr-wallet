import type { ResolvedFederationMetadata } from 'src/services/federation-metadata'

export type Federation = {
  title: string
  inviteCode: string
  federationId: string
  // external url to get meta data from the federation like chat-url, max-balance etc.
  metaUrl?: string
  // mainnet | testnet | regtest | signet
  network?: string
  modules: ModuleConfig[]
  guardians?: FederationGuardian[]
  metadata?: ResolvedFederationMetadata
}

export type DiscoverySelectionPayload = {
  inviteCode: string
  prefetchedFederation?: Federation
}

export type FederationGuardian = {
  peerId: number
  name: string
  url: string
}

export type FederationUtxo = {
  txid: string
  vout: number
  amount: number
}

export type ModuleConfig = {
  config: string
  kind: string
  version: {
    major: number
    minor: number
  }
}

export type FederationConfig = {
  meta: {
    federation_name: string
    meta_external_url: string
  }
  modules: ModuleConfig[]
}

export type FederationMeta = ResolvedFederationMetadata
