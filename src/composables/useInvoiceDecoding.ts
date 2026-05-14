import { computed, shallowRef } from 'vue'
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

type InvoiceAmountRequiredState =
  | {
      type: 'amount-required'
      source: 'lightning-address'
      lnAddress: LightningAddress
      limits: LnurlPayLimits | null
    }
  | {
      type: 'amount-required'
      source: 'lnurl'
      limits: LnurlPayLimits | null
    }

type InvoiceDecodedState = {
  type: 'invoice'
  invoice: Bolt11Invoice
}

type InvoiceDecodeErrorState = {
  type: 'error'
  message: string
  error: Error
}

type InvoiceSettledState =
  | InvoiceAmountRequiredState
  | InvoiceDecodedState
  | InvoiceDecodeErrorState

export type InvoiceDecodeState =
  | {
      type: 'idle'
    }
  | {
      type: 'processing'
      previous: InvoiceSettledState | null
    }
  | InvoiceSettledState

export type InvoiceDecodeResult = InvoiceSettledState

export type InvoiceFromInputResult =
  | {
      type: 'success'
      invoice: Bolt11Invoice
    }
  | {
      type: 'error'
      error: Error
    }

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(getErrorMessage(error))
}

export function useInvoiceDecoding() {
  const lightningStore = useLightningStore()
  const notify = useAppNotify()
  const decodeState = shallowRef<InvoiceDecodeState>({ type: 'idle' })
  const visibleState = computed(() =>
    decodeState.value.type === 'processing' ? decodeState.value.previous : decodeState.value,
  )
  const isProcessing = computed(() => decodeState.value.type === 'processing')
  const amountRequired = computed(() => visibleState.value?.type === 'amount-required')
  const lnAddress = computed(() =>
    visibleState.value?.type === 'amount-required' &&
    visibleState.value.source === 'lightning-address'
      ? visibleState.value.lnAddress
      : null,
  )
  const lnurlPayLimits = computed(() =>
    visibleState.value?.type === 'amount-required' ? visibleState.value.limits : null,
  )
  const decodedInvoice = computed(() =>
    visibleState.value?.type === 'invoice' ? visibleState.value.invoice : null,
  )

  function getPreviousSettledState(): InvoiceSettledState | null {
    return decodeState.value.type === 'processing'
      ? decodeState.value.previous
      : decodeState.value.type === 'idle'
        ? null
        : decodeState.value
  }

  function setErrorState(error: unknown): InvoiceDecodeErrorState {
    const normalizedError = toError(error)
    const errorState: InvoiceDecodeErrorState = {
      type: 'error',
      message: normalizedError.message,
      error: normalizedError,
    }
    decodeState.value = errorState
    return errorState
  }

  function clearDecodedInvoice() {
    if (visibleState.value?.type === 'invoice') {
      decodeState.value = { type: 'idle' }
    }
  }

  /**
   * Decode a lightning invoice, LNURL, or lightning address
   * @param invoice - The invoice string to decode
   * @returns A variant describing the decoded invoice, amount request, or error
   */
  async function decodeInvoice(invoice: string): Promise<InvoiceDecodeResult> {
    decodeState.value = { type: 'processing', previous: null }

    // Lightning address (e.g., user@domain.com)
    if (invoice.includes('@')) {
      const lightningAddress = new LightningAddress(invoice)

      try {
        await lightningAddress.fetchWithProxy()
        if (lightningAddress.lnurlpData == null) {
          const errorState = setErrorState(new Error('Invalid lightning address'))
          notify.error(errorState.message)
          return errorState
        }

        const amountState: InvoiceAmountRequiredState = {
          type: 'amount-required',
          source: 'lightning-address',
          lnAddress: lightningAddress,
          limits: readLightningAddressLimits(lightningAddress.lnurlpData),
        }
        decodeState.value = amountState
        return amountState
      } catch (error) {
        const errorState = setErrorState(error)
        notify.error(`Failed to fetch lightning address: ${errorState.message}`)
        return errorState
      }
    }

    // LNURL
    if (invoice.toLowerCase().startsWith('lnurl1')) {
      try {
        const params = await resolveLnurl(invoice)
        if (params.tag !== 'payRequest') {
          const errorState = setErrorState(new Error('LNURL is not a payment request'))
          notify.error(errorState.message)
          return errorState
        }

        const amountState: InvoiceAmountRequiredState = {
          type: 'amount-required',
          source: 'lnurl',
          limits: readLnurlPayParamsLimits(params),
        }
        decodeState.value = amountState
        return amountState
      } catch (error) {
        const errorState = setErrorState(error)
        notify.error(`Failed to load LNURL payment request: ${errorState.message}`)
        return errorState
      }
    }

    // Regular bolt11 invoice
    try {
      const decoded = lightningStore.decodeInvoice(invoice)
      const decodedState: InvoiceDecodedState = {
        type: 'invoice',
        invoice: decoded,
      }
      decodeState.value = decodedState
      return decodedState
    } catch (error) {
      const errorState = setErrorState(error)
      notify.error(`Failed to decode invoice: ${errorState.message}`)
      return errorState
    }
  }

  /**
   * Create an invoice from LNURL or lightning address
   * @param input - The LNURL or lightning address
   * @param amountSats - The amount in satoshis
   * @param memo - Optional memo for the invoice
   * @returns The created invoice variant or an error variant
   */
  async function createInvoiceFromInput(
    input: string,
    amountSats: number,
    memo: string,
  ): Promise<InvoiceFromInputResult> {
    const previousState = getPreviousSettledState()
    decodeState.value = { type: 'processing', previous: previousState }

    function failInvoiceCreation(message: string): InvoiceFromInputResult {
      const errorState = setErrorState(new Error(message))
      notify.error(message)
      return {
        type: 'error',
        error: errorState.error,
      }
    }

    try {
      let invoiceString = ''

      if (previousState?.type !== 'amount-required') {
        return failInvoiceCreation('Decode the payment request before creating an invoice.')
      }

      if (previousState.source === 'lightning-address') {
        if (previousState.lnAddress.lnurlpData == null) {
          return failInvoiceCreation('Lightning address could not be loaded. Please try again.')
        }

        const amountError = getLnurlAmountError(amountSats, previousState.limits)
        if (amountError != null) {
          return failInvoiceCreation(amountError)
        }

        const invoice = await previousState.lnAddress.requestInvoice({
          satoshi: amountSats,
          comment: memo,
        })

        if (invoice != null) {
          invoiceString = invoice.paymentRequest
        }
      } else if (previousState.source === 'lnurl') {
        const amountError = getLnurlAmountError(amountSats, previousState.limits)
        if (amountError != null) {
          return failInvoiceCreation(amountError)
        }

        invoiceString = await requestInvoice(input, amountSats)
      }

      if (invoiceString !== '') {
        const decoded = lightningStore.decodeInvoice(invoiceString)
        decodeState.value = {
          type: 'invoice',
          invoice: decoded,
        }
        return {
          type: 'success',
          invoice: decoded,
        }
      }

      throw new Error('Failed to create invoice')
    } catch (error) {
      const errorState = setErrorState(error)
      notify.error(`Failed to create invoice: ${errorState.message}`)
      return {
        type: 'error',
        error: errorState.error,
      }
    } finally {
      Loading.hide()
    }
  }

  return {
    decodeState,
    isProcessing,
    amountRequired,
    lnAddress,
    lnurlPayLimits,
    decodedInvoice,
    decodeInvoice,
    createInvoiceFromInput,
    clearDecodedInvoice,
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
