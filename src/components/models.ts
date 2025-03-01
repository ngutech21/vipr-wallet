export type Federation = {
  title: string
  inviteCode: string
  federationId: string
  // external url to get meta data from the federation like chat-url, max-balance etc.
  metaUrl: string
  icon_url?: string
  // mainnet | testnet | regtest | signet
  network?: string
}

export type FederationConfig = {
  meta: {
    federation_name: string
    meta_external_url: string
  }
}

export type FederationMeta = {
  chat_server_domain: string
  default_currency: string
  federation_icon_url: string
  max_balance_msats: string
  max_invoice_msats: string
  onchain_deposits_disabled: boolean
  public: string
  stability_pool_disabled: boolean
  welcome_message: string
  tos_url: string
  invite_code: string
  preview_message: string
  popup_end_timestamp: string
  popup_countdown_message: string
}

export type Bolt11Invoice = {
  invoice: string
  paymentHash: string
  amount: number
  timestamp: number
  expiry: number | undefined
  description: string | null
}

export type BaseTransaction = {
  id: string
  createdAt: Date
  amountInSats: number
  amountInFiat: number
  fiatCurrency: 'usd' | 'eur' | 'gbp'
}

export type LightningReceiveTransaction = BaseTransaction & {
  invoice: string
  status: 'pending' | 'completed' | 'expired'
  memo?: string
}

export type LightningSendTransaction = BaseTransaction & {
  invoice: string
  feeInMsats?: number
  status: 'pending' | 'completed' | 'failed'
  memo?: string
  federationId: string
}

export type AnyTransaction =
  | (LightningReceiveTransaction & { type: 'receive' })
  | (LightningSendTransaction & { type: 'send' })
