import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useLightningPayment } from 'src/composables/useLightningPayment'

// Mock wallet store
const mockUpdateBalance = vi.fn()
const mockPayInvoice = vi.fn()
const mockWaitForPay = vi.fn()
const mockSubscribeInternalPayment = vi.fn()
const mockCreateInvoice = vi.fn()
const mockWaitForReceive = vi.fn()
const mockAssertCanSpendDuringRecovery = vi.fn()

vi.mock('src/stores/wallet', () => ({
  useWalletStore: vi.fn(() => ({
    wallet: {
      lightning: {
        payInvoice: mockPayInvoice,
        waitForPay: mockWaitForPay,
        subscribeInternalPayment: mockSubscribeInternalPayment,
        createInvoice: mockCreateInvoice,
        waitForReceive: mockWaitForReceive,
      },
    },
    updateBalance: mockUpdateBalance,
    assertCanSpendDuringRecovery: mockAssertCanSpendDuringRecovery,
  })),
}))

// Mock Quasar
vi.mock('quasar', () => ({
  useQuasar: vi.fn(() => ({
    notify: vi.fn(),
  })),
  Loading: {
    show: vi.fn(),
    hide: vi.fn(),
  },
}))

describe('useLightningPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAssertCanSpendDuringRecovery.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('payInvoice', () => {
    it('should successfully pay an invoice', async () => {
      mockPayInvoice.mockResolvedValue({
        fee: 100,
        payment_type: {
          lightning: 'ln-op-123',
        },
      })
      mockWaitForPay.mockResolvedValue({
        success: true,
        data: {
          preimage: 'abc',
        },
      })

      const { payInvoice } = useLightningPayment()

      const result = await payInvoice('lnbc1000n1...', 1000)

      expect(result.success).toBe(true)
      expect(result.amountSats).toBe(1000)
      expect(result.fee).toBe(100)
      expect(mockAssertCanSpendDuringRecovery).toHaveBeenCalledTimes(1)
      expect(mockPayInvoice).toHaveBeenCalledWith('lnbc1000n1...')
      expect(mockWaitForPay).toHaveBeenCalledWith('ln-op-123')
      expect(mockUpdateBalance).toHaveBeenCalled()
    })

    it('should block payment while wallet recovery is running', async () => {
      mockAssertCanSpendDuringRecovery.mockImplementation(() => {
        throw new Error('Wallet recovery is still running')
      })

      const { payInvoice } = useLightningPayment()

      const result = await payInvoice('lnbc1000n1...', 1000)

      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('Wallet recovery is still running')
      expect(mockPayInvoice).not.toHaveBeenCalled()
    })

    it('waits for internal payments via the internal payment subscription', async () => {
      vi.useFakeTimers()
      mockPayInvoice.mockResolvedValue({
        fee: 100,
        payment_type: {
          internal: 'internal-op-123',
        },
      })
      mockSubscribeInternalPayment.mockImplementation((_paymentId, onSuccess) => {
        window.setTimeout(() => {
          onSuccess({ preimage: 'abc' })
        }, 100)

        return vi.fn()
      })

      const { payInvoice } = useLightningPayment()
      const paymentPromise = payInvoice('lnbc1000n1...', 1000)

      await vi.advanceTimersByTimeAsync(100)
      const result = await paymentPromise

      expect(result.success).toBe(true)
      expect(mockSubscribeInternalPayment).toHaveBeenCalledWith(
        'internal-op-123',
        expect.any(Function),
        expect.any(Function),
      )
    })

    it('should handle payment errors', async () => {
      mockPayInvoice.mockRejectedValue(new Error('Payment failed'))

      const { payInvoice } = useLightningPayment()

      const result = await payInvoice('lnbc1000n1...', 1000)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('createInvoice', () => {
    it('should successfully create an invoice', async () => {
      mockCreateInvoice.mockResolvedValue({
        invoice: 'lnbc1000n1...',
        operation_id: 'op-123',
      })

      const { createInvoice } = useLightningPayment()

      const result = await createInvoice(1000, 'test invoice', 1200)

      expect(result.success).toBe(true)
      expect(result.invoice).toBe('lnbc1000n1...')
      expect(result.operationId).toBe('op-123')
      expect(mockCreateInvoice).toHaveBeenCalledWith(1000000, 'test invoice', 1200)
    })

    it('should handle invoice creation errors', async () => {
      mockCreateInvoice.mockRejectedValue(new Error('Creation failed'))

      const { createInvoice } = useLightningPayment()

      const result = await createInvoice(1000, 'test', 1200)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('waitForInvoicePayment', () => {
    it('should successfully wait for payment', async () => {
      mockWaitForReceive.mockResolvedValue(undefined)

      const { waitForInvoicePayment } = useLightningPayment()

      const result = await waitForInvoicePayment('op-123', 120000)

      expect(result.success).toBe(true)
      expect(mockWaitForReceive).toHaveBeenCalledWith('op-123', 120000)
      expect(mockUpdateBalance).toHaveBeenCalled()
    })

    it('should handle timeout errors', async () => {
      mockWaitForReceive.mockRejectedValue(new Error('Timeout'))

      const { waitForInvoicePayment } = useLightningPayment()

      const result = await waitForInvoicePayment('op-123', 120000)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})
