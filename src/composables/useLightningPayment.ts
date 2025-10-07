import { ref } from 'vue'
import { useQuasar, Loading } from 'quasar'
import { useWalletStore } from 'src/stores/wallet'
import { getErrorMessage } from 'src/utils/error'
import { logger } from 'src/services/logger'

export interface PaymentResult {
  success: boolean
  amountSats?: number
  fee?: number
  error?: Error
}

export interface InvoiceCreationResult {
  success: boolean
  invoice?: string
  operationId?: string
  amountMsats?: number
  error?: Error
}

export interface InvoiceWaitResult {
  success: boolean
  amountSats?: number
  error?: Error
}

export function useLightningPayment() {
  const walletStore = useWalletStore()
  const $q = useQuasar()
  const isProcessing = ref(false)

  /**
   * Pay a lightning invoice
   * @param invoice - The invoice string to pay
   * @param expectedAmountSats - Expected amount in sats (optional, for validation)
   * @returns Payment result with success status, amount, and fee
   */
  async function payInvoice(invoice: string, expectedAmountSats?: number): Promise<PaymentResult> {
    try {
      isProcessing.value = true
      Loading.show({ message: 'Processing payment...' })

      const paymentResult = await walletStore.wallet?.lightning.payInvoice(invoice)
      await walletStore.updateBalance()

      const amount = expectedAmountSats ?? 0
      const fee = paymentResult?.fee ?? 0

      logger.logTransaction('Lightning payment sent successfully', {
        amount,
        fee,
      })

      return {
        success: true,
        amountSats: amount,
        fee,
      }
    } catch (error) {
      logger.error('Failed to pay invoice', error)
      $q.notify({
        type: 'negative',
        message: `Failed to pay invoice: ${getErrorMessage(error)}`,
        position: 'top',
      })

      return {
        success: false,
        error: error as Error,
      }
    } finally {
      isProcessing.value = false
      Loading.hide()
    }
  }

  /**
   * Create a lightning invoice
   * @param amountSats - Amount in satoshis
   * @param description - Invoice description
   * @param expirySeconds - Expiry time in seconds (default: 1200 = 20 minutes)
   * @returns Invoice creation result with invoice string and operation ID
   */
  async function createInvoice(
    amountSats: number,
    description: string,
    expirySeconds: number = 1200,
  ): Promise<InvoiceCreationResult> {
    try {
      isProcessing.value = true

      logger.logTransaction('Creating Lightning invoice', { amount: amountSats })

      const amountMsats = amountSats * 1_000
      const invoice = await walletStore.wallet?.lightning.createInvoice(
        amountMsats,
        description,
        expirySeconds,
      )

      if (invoice == null) {
        throw new Error('Failed to create invoice')
      }

      logger.logTransaction('Invoice created successfully')

      return {
        success: true,
        invoice: invoice.invoice,
        operationId: invoice.operation_id,
        amountMsats: amountMsats,
      }
    } catch (error) {
      logger.error('Failed to create invoice', error)
      $q.notify({
        type: 'negative',
        message: `Failed to create invoice: ${getErrorMessage(error)}`,
        position: 'top',
      })

      return {
        success: false,
        error: error as Error,
      }
    } finally {
      isProcessing.value = false
    }
  }

  /**
   * Wait for a lightning invoice to be paid
   * @param operationId - The operation ID from invoice creation
   * @param timeoutMs - Timeout in milliseconds
   * @returns Wait result with success status
   */
  async function waitForInvoicePayment(
    operationId: string,
    timeoutMs: number,
  ): Promise<InvoiceWaitResult> {
    try {
      logger.logTransaction('Waiting for Lightning payment')

      await walletStore.wallet?.lightning.waitForReceive(operationId, timeoutMs)

      logger.logTransaction('Lightning payment received successfully')

      await walletStore.updateBalance()

      return {
        success: true,
      }
    } catch (error) {
      logger.error('Failed waiting for invoice payment', error)

      let errorMessage = 'An unknown error occurred.'
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      }

      $q.notify({
        message: `Error receiving payment: ${errorMessage}`,
        color: 'negative',
        position: 'top',
      })

      return {
        success: false,
        error: error as Error,
      }
    }
  }

  return {
    isProcessing,
    payInvoice,
    createInvoice,
    waitForInvoicePayment,
  }
}
