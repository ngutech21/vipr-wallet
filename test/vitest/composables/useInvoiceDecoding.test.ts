import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useInvoiceDecoding } from 'src/composables/useInvoiceDecoding'

// Mock the lightning store
vi.mock('src/stores/lightning', () => ({
  useLightningStore: vi.fn(() => ({
    decodeInvoice: vi.fn((invoice: string) => ({
      invoice,
      amount: 1000,
      description: 'test',
    })),
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

// Mock LightningAddress
vi.mock('@getalby/lightning-tools', () => ({
  LightningAddress: vi.fn(),
}))

// Mock LNURL utils
vi.mock('src/utils/lnurl', () => ({
  requestInvoice: vi.fn(() => Promise.resolve('lnbc1000n1...')),
}))

describe('useInvoiceDecoding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
  })
})
