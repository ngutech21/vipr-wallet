import { ref } from 'vue'
import { Loading } from 'quasar'
import { useLightningStore } from 'src/stores/lightning'
import { LightningAddress } from '@getalby/lightning-tools'
import { useAppNotify } from 'src/composables/useAppNotify'
import { requestInvoice, resolveLnurl, type LnurlPayParams } from 'src/utils/lnurl'
import { getErrorMessage } from 'src/utils/error'
import type { Bolt11Invoice } from 'src/types/lightning'

export type LnurlPayLimits = {
  minSendableMsats: number
  maxSendableMsats: number
}

export interface InvoiceDecodingResult {
  decodedInvoice: Bolt11Invoice | null
  amountRequired: boolean
  lnAddress: LightningAddress | null
}

export function useInvoiceDecoding() {
  const lightningStore = useLightningStore()
  const notify = useAppNotify()
  const isProcessing = ref(false)
  const amountRequired = ref(false)
  const lnAddress = ref<LightningAddress | null>(null)
  const lnurlPayLimits = ref<LnurlPayLimits | null>(null)
  const decodedInvoice = ref<Bolt11Invoice | null>(null)

  function resetAmountRequestState() {
    amountRequired.value = false
    lnAddress.value = null
    lnurlPayLimits.value = null
  }

  /**
   * Decode a lightning invoice, LNURL, or lightning address
   * @param invoice - The invoice string to decode
   * @returns The decoded invoice or null if amount is required
   */
  async function decodeInvoice(invoice: string): Promise<Bolt11Invoice | null> {
    isProcessing.value = true
    decodedInvoice.value = null
    resetAmountRequestState()

    try {
      // Lightning address (e.g., user@domain.com)
      if (invoice.includes('@')) {
        amountRequired.value = true
        lnAddress.value = new LightningAddress(invoice)

        try {
          await lnAddress.value.fetchWithProxy()
          if (lnAddress.value.lnurlpData == null) {
            resetAmountRequestState()
            notify.error('Invalid lightning address')
            return null
          }
          lnurlPayLimits.value = readLightningAddressLimits(lnAddress.value.lnurlpData)
        } catch (error) {
          resetAmountRequestState()
          notify.error(`Failed to fetch lightning address: ${getErrorMessage(error)}`)
          return null
        }

        return null // Amount is required, no invoice yet
      }

      // LNURL
      if (invoice.toLowerCase().startsWith('lnurl1')) {
        try {
          const params = await resolveLnurl(invoice)
          if (params.tag !== 'payRequest') {
            notify.error('LNURL is not a payment request')
            return null
          }

          amountRequired.value = true
          lnurlPayLimits.value = readLnurlPayParamsLimits(params)
        } catch (error) {
          resetAmountRequestState()
          notify.error(`Failed to load LNURL payment request: ${getErrorMessage(error)}`)
          return null
        }
        return null // Amount is required, no invoice yet
      }

      // Regular bolt11 invoice
      try {
        decodedInvoice.value = lightningStore.decodeInvoice(invoice)
        return decodedInvoice.value
      } catch (error) {
        notify.error(`Failed to decode invoice: ${getErrorMessage(error)}`)
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
        if (lnAddress.value.lnurlpData == null) {
          resetAmountRequestState()
          notify.error('Lightning address could not be loaded. Please try again.')
          return null
        }

        const amountError = getLnurlAmountError(amountSats, lnurlPayLimits.value)
        if (amountError != null) {
          notify.error(amountError)
          return null
        }

        const invoice = await lnAddress.value.requestInvoice({
          satoshi: amountSats,
          comment: memo,
        })

        if (invoice != null) {
          invoiceString = invoice.paymentRequest
        }
      } else {
        // LNURL
        const amountError = getLnurlAmountError(amountSats, lnurlPayLimits.value)
        if (amountError != null) {
          notify.error(amountError)
          return null
        }

        invoiceString = await requestInvoice(input, amountSats)
      }

      if (invoiceString !== '') {
        decodedInvoice.value = lightningStore.decodeInvoice(invoiceString)
        return decodedInvoice.value
      }

      return null
    } catch (error) {
      notify.error(`Failed to create invoice: ${getErrorMessage(error)}`)
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
    lnurlPayLimits,
    decodedInvoice,
    decodeInvoice,
    createInvoiceFromInput,
  }
}

export function getLnurlAmountError(
  amountSats: number,
  limits: LnurlPayLimits | null,
): string | null {
  if (limits == null) {
    return null
  }

  const minSats = Math.ceil(limits.minSendableMsats / 1_000)
  const maxSats = Math.floor(limits.maxSendableMsats / 1_000)

  if (!Number.isFinite(minSats) || !Number.isFinite(maxSats) || minSats > maxSats) {
    return 'Invalid LNURL amount limits'
  }

  if (amountSats < minSats) {
    return `Amount must be at least ${minSats.toLocaleString()} sats`
  }

  if (amountSats > maxSats) {
    return `Amount must be ${maxSats.toLocaleString()} sats or less`
  }

  return null
}

function readLnurlPayParamsLimits(params: LnurlPayParams): LnurlPayLimits | null {
  if (params.minSendable == null || params.maxSendable == null) {
    return null
  }

  return normalizeLnurlLimits(params.minSendable, params.maxSendable)
}

function readLightningAddressLimits(lnurlpData: unknown): LnurlPayLimits | null {
  if (lnurlpData == null || typeof lnurlpData !== 'object') {
    return null
  }

  const record = lnurlpData as Record<string, unknown>
  const rawData =
    record.rawData != null && typeof record.rawData === 'object'
      ? (record.rawData as Record<string, unknown>)
      : null
  const min = readNumber(record.min ?? rawData?.minSendable)
  const max = readNumber(record.max ?? rawData?.maxSendable)

  if (min == null || max == null) {
    return null
  }

  return normalizeLnurlLimits(min, max)
}

function normalizeLnurlLimits(minSendableMsats: number, maxSendableMsats: number) {
  if (
    !Number.isFinite(minSendableMsats) ||
    !Number.isFinite(maxSendableMsats) ||
    minSendableMsats <= 0 ||
    maxSendableMsats <= 0
  ) {
    return null
  }

  return {
    minSendableMsats,
    maxSendableMsats,
  }
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}
