export interface Federation {
  title: string
  inviteCode: string
  federationId: string
}

export interface LightningTransaction {
  id?: string
  invoice: string
  createdAt: Date
  amountInSats: number
}

export interface Bolt11Invoice {
  paymentHash: string
  amount: number
  timestamp: number
  expiry: number
  description: string
}
