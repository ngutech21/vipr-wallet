export interface Federation {
  title: string
  inviteCode: string
  federationId: string
  // external url to get meta data from the federation like chat-url, max-balance etc.
  metaUrl: string
  icon_url?: string
}

export interface FederationConfig {
  meta: {
    federation_name: string
    meta_external_url: string
  }
}

export interface FederationMeta {
  chat_server_domain: string
  default_currency: string
  federation_icon_url: string
  max_balance_msats: string
  max_invoice_msats: string
  onchain_deposits_disabled: string
  public: string
  stability_pool_disabled: string
  welcome_message: string
  tos_url: string
  invite_code: string
  preview_message: string
  popup_end_timestamp: string
  popup_countdown_message: string
}

export interface LightningTransaction {
  id?: string
  invoice: string
  createdAt: Date
  amountInSats: number
}

export interface Bolt11Invoice {
  invoice: string
  paymentHash: string
  amount: number
  timestamp: number
  expiry: number
  description: string
}
