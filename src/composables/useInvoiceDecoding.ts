import { ref } from 'vue'
import { useQuasar, Loading } from 'quasar'
import { useLightningStore } from 'src/stores/lightning'
import { LightningAddress } from '@getalby/lightning-tools'
import { requestInvoice } from 'src/utils/lnurl'
import { getErrorMessage } from 'src/utils/error'
import type { Bolt11Invoice } from 'src/components/models'

export interface InvoiceDecodingResult {
  decodedInvoice: Bolt11Invoice | null
  amountRequired: boolean
  lnAddress: LightningAddress | null
}

export function useInvoiceDecoding() {
  const lightningStore = useLightningStore()
  const $q = useQuasar()
  const isProcessing = ref(false)
  const amountRequired = ref(false)
  const lnAddress = ref<LightningAddress | null>(null)
  const decodedInvoice = ref<Bolt11Invoice | null>(null)

  /**
   * Decode a lightning invoice, LNURL, or lightning address
   * @param invoice - The invoice string to decode
   * @returns The decoded invoice or null if amount is required
   */
  async function decodeInvoice(invoice: string): Promise<Bolt11Invoice | null> {
    isProcessing.value = true
    decodedInvoice.value = null
    amountRequired.value = false
    lnAddress.value = null

    try {
      // Lightning address (e.g., user@domain.com)
      if (invoice.includes('@')) {
        amountRequired.value = true
        lnAddress.value = new LightningAddress(invoice)

        try {
          await lnAddress.value.fetchWithProxy()
          if (lnAddress.value.lnurlpData == null) {
            amountRequired.value = false
            lnAddress.value = null
            $q.notify({
              type: 'negative',
              message: 'Invalid lightning address',
              position: 'top',
            })
            return null
          }
        } catch (error) {
          $q.notify({
            type: 'negative',
            message: `Failed to fetch lightning address: ${getErrorMessage(error)}`,
            position: 'top',
          })
          return null
        }

        return null // Amount is required, no invoice yet
      }

      // LNURL
      if (invoice.toLowerCase().startsWith('lnurl1')) {
        amountRequired.value = true
        return null // Amount is required, no invoice yet
      }

      // Regular bolt11 invoice
      try {
        decodedInvoice.value = lightningStore.decodeInvoice(invoice)
        return decodedInvoice.value
      } catch (error) {
        $q.notify({
          type: 'negative',
          message: `Failed to decode invoice: ${getErrorMessage(error)}`,
          position: 'top',
        })
        return null
      }
    } finally {
      isProcessing.value = false
    }
  }

  /**
   * Create an invoice from LNURL or lightning address
   * @param input - The LNURL or lightning address
   * @param amountSats - The amount in satoshis
   * @param memo - Optional memo for the invoice
   * @returns The created invoice string or null on error
   */
  async function createInvoiceFromInput(
    input: string,
    amountSats: number,
    memo: string,
  ): Promise<Bolt11Invoice | null> {
    try {
      isProcessing.value = true

      let invoiceString = ''

      // If we have a lightning address
      if (lnAddress.value != null) {
        const invoice = await lnAddress.value.requestInvoice({
          satoshi: amountSats,
          comment: memo,
        })

        if (invoice != null) {
          invoiceString = invoice.paymentRequest
        }
      } else {
        // LNURL
        invoiceString = await requestInvoice(input, amountSats)
      }

      if (invoiceString !== '') {
        decodedInvoice.value = lightningStore.decodeInvoice(invoiceString)
        return decodedInvoice.value
      }

      return null
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: `Failed to create invoice: ${getErrorMessage(error)}`,
        position: 'top',
      })
      return null
    } finally {
      isProcessing.value = false
      Loading.hide()
    }
  }

  return {
    isProcessing,
    amountRequired,
    lnAddress,
    decodedInvoice,
    decodeInvoice,
    createInvoiceFromInput,
  }
}
