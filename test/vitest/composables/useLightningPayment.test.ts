import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useLightningPayment } from 'src/composables/useLightningPayment'

// Mock wallet store
const mockUpdateBalance = vi.fn()
const mockPayInvoice = vi.fn()
const mockCreateInvoice = vi.fn()
const mockWaitForReceive = vi.fn()

vi.mock('src/stores/wallet', () => ({
  useWalletStore: vi.fn(() => ({
    wallet: {
      lightning: {
        payInvoice: mockPayInvoice,
        createInvoice: mockCreateInvoice,
        waitForReceive: mockWaitForReceive,
      },
    },
    updateBalance: mockUpdateBalance,
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
  })

  describe('payInvoice', () => {
    it('should successfully pay an invoice', async () => {
      mockPayInvoice.mockResolvedValue({ fee: 100 })

      const { payInvoice } = useLightningPayment()

      const result = await payInvoice('lnbc1000n1...', 1000)

      expect(result.success).toBe(true)
      expect(result.amountSats).toBe(1000)
      expect(result.fee).toBe(100)
      expect(mockPayInvoice).toHaveBeenCalledWith('lnbc1000n1...')
      expect(mockUpdateBalance).toHaveBeenCalled()
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
