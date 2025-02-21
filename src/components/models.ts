export interface Federation {
  title: string
  inviteCode: string
  federationId: string
}

export interface FederationConfig {
  meta: {
    federation_name: string
    meta_external_url: string
  }
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
