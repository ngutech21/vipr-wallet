import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useInvoiceDecoding } from 'src/composables/useInvoiceDecoding'

const { mockDecodeInvoice, mockLightningAddress, mockRequestInvoice, mockNotifyError } = vi.hoisted(
  () => ({
    mockDecodeInvoice: vi.fn((invoice: string) => ({
      invoice,
      amount: 1000,
      description: 'test',
    })),
    mockLightningAddress: vi.fn(),
    mockRequestInvoice: vi.fn(() => Promise.resolve('lnbc1000n1...')),
    mockNotifyError: vi.fn(),
  }),
)

// Mock the lightning store
vi.mock('src/stores/lightning', () => ({
  useLightningStore: vi.fn(() => ({
    decodeInvoice: mockDecodeInvoice,
  })),
}))

// Mock Quasar
vi.mock('quasar', () => ({
  useQuasar: vi.fn(() => ({
    notify: vi.fn(),
  })),
  Loading: {
    hide: vi.fn(),
  },
}))

vi.mock('src/composables/useAppNotify', () => ({
  useAppNotify: vi.fn(() => ({
    error: mockNotifyError,
  })),
}))

// Mock LightningAddress
vi.mock('@getalby/lightning-tools', () => ({
  LightningAddress: mockLightningAddress,
}))

// Mock LNURL utils
vi.mock('src/utils/lnurl', () => ({
  requestInvoice: mockRequestInvoice,
}))

describe('useInvoiceDecoding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLightningAddress.mockImplementation(function () {
      return {
        fetchWithProxy: vi.fn().mockResolvedValue(undefined),
        requestInvoice: vi.fn().mockResolvedValue({
          paymentRequest: 'lnbc1000n1...',
        }),
        lnurlpData: {
          callback: 'https://example.com/callback',
        },
      }
    })
  })

  describe('decodeInvoice', () => {
    it('should decode a regular bolt11 invoice', async () => {
      const { decodeInvoice } = useInvoiceDecoding()

      const result = await decodeInvoice('lnbc1000n1...')

      expect(result).toBeDefined()
      expect(result?.invoice).toBe('lnbc1000n1...')
    })

    it('should detect lightning address and set amountRequired', async () => {
      const { decodeInvoice, amountRequired } = useInvoiceDecoding()

      await decodeInvoice('user@domain.com')

      expect(amountRequired.value).toBe(true)
    })

    it('should reset lightning address state when fetching a lightning address fails', async () => {
      mockLightningAddress.mockImplementation(function () {
        return {
          fetchWithProxy: vi.fn().mockRejectedValue(new Error('boom')),
          requestInvoice: vi.fn(),
          lnurlpData: null,
        }
      })

      const { decodeInvoice, amountRequired, lnAddress } = useInvoiceDecoding()

      await decodeInvoice('user@domain.com')

      expect(amountRequired.value).toBe(false)
      expect(lnAddress.value).toBeNull()
      expect(mockNotifyError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch lightning address'),
      )
    })

    it('should detect LNURL and set amountRequired', async () => {
      const { decodeInvoice, amountRequired } = useInvoiceDecoding()

      await decodeInvoice('lnurl1...')

      expect(amountRequired.value).toBe(true)
    })

    it('should set isProcessing to false after decoding', async () => {
      const { decodeInvoice, isProcessing } = useInvoiceDecoding()

      const promise = decodeInvoice('lnbc1000n1...')
      // isProcessing should be true during execution
      await promise

      // Should be false after completion
      expect(isProcessing.value).toBe(false)
    })
  })

  describe('createInvoiceFromInput', () => {
    it('should create an invoice from LNURL', async () => {
      const { createInvoiceFromInput, decodedInvoice } = useInvoiceDecoding()

      const result = await createInvoiceFromInput('lnurl1...', 1000, 'Test memo')

      expect(result).toBeDefined()
      expect(decodedInvoice.value).toBeDefined()
    })

    it('should not request an invoice when the lightning address data is missing', async () => {
      const { createInvoiceFromInput, amountRequired, lnAddress } = useInvoiceDecoding()
      const requestInvoice = vi.fn()

      amountRequired.value = true
      lnAddress.value = {
        requestInvoice,
        lnurlpData: null,
      } as never

      const result = await createInvoiceFromInput('user@domain.com', 1000, 'Test memo')

      expect(result).toBeNull()
      expect(requestInvoice).not.toHaveBeenCalled()
      expect(amountRequired.value).toBe(false)
      expect(lnAddress.value).toBeNull()
      expect(mockNotifyError).toHaveBeenCalledWith(
        'Lightning address could not be loaded. Please try again.',
      )
    })
  })
})
