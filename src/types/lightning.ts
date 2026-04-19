export type Bolt11Invoice = {
  invoice: string
  paymentHash: string
  amount: number
  timestamp: number
  expiry: number | undefined
  description: string | null
}
