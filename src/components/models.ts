export type Federation = {
  title: string
  inviteCode: string
  federationId: string
  // external url to get meta data from the federation like chat-url, max-balance etc.
  metaUrl?: string
  // mainnet | testnet | regtest | signet
  network?: string
  modules: ModuleConfig[]
  metadata?: FederationMeta
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

export type FederationMeta = {
  chat_server_domain?: string
  default_currency?: string
  federation_icon_url?: string
  max_balance_msats?: string
  max_invoice_msats?: string
  onchain_deposits_disabled?: boolean
  public?: string
  stability_pool_disabled?: boolean
  welcome_message?: string
  tos_url?: string
  invite_code?: string
  preview_message?: string
  popup_end_timestamp?: string
  popup_countdown_message?: string
}

export type Bolt11Invoice = {
  invoice: string
  paymentHash: string
  amount: number
  timestamp: number
  expiry: number | undefined
  description: string | null
}
