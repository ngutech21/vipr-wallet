import { defineStore } from 'pinia'
import { decode } from 'light-bolt11-decoder'
import type { Bolt11Invoice } from 'src/components/models'

export const useLightningStore = defineStore('lightning', {
  state: () => ({}),
  actions: {
    decodeInvoice(invoice: string): Bolt11Invoice {
      const decoded = decode(invoice)

      // Find specific sections by their name
      const paymentHashSection = decoded.sections.find((s) => s.name === 'payment_hash')
      const amountSection = decoded.sections.find((s) => s.name === 'amount')
      const descriptionSection = decoded.sections.find((s) => s.name === 'description')
      const timestampSection = decoded.sections.find((s) => s.name === 'timestamp')

      const bolt11Invoice: Bolt11Invoice = {
        invoice,
        paymentHash: paymentHashSection?.value || '',
        amount: amountSection ? parseInt(amountSection.value) : 0,
        timestamp: timestampSection?.value || 0,
        expiry: decoded.expiry || 0,
        description: descriptionSection?.value || '',
      }

      return bolt11Invoice
    },
  },
})
