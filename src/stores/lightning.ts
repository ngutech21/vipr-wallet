import { defineStore } from 'pinia'
import type { Bolt11Invoice } from 'src/components/models'
import { getFiatValue, Invoice } from '@getalby/lightning-tools'

export const useLightningStore = defineStore('lightning', {
  state: () => ({}),
  actions: {
    decodeInvoice(invoice: string): Bolt11Invoice {
      const { paymentHash, satoshi, description, expiry, timestamp } = new Invoice({
        pr: invoice,
      })

      return {
        invoice,
        paymentHash,
        amount: satoshi,
        timestamp: timestamp,
        expiry: expiry,
        description,
      } satisfies Bolt11Invoice
    },
    async satsToFiat(amountInSats: number): Promise<number> {
      // FIXME store the currency in the store and make it configurable in settings
      return await getFiatValue({ satoshi: amountInSats, currency: 'usd' })
    },
  },
})
