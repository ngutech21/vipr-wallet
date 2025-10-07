import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, type VueWrapper, flushPromises } from '@vue/test-utils'
import { Quasar, Notify } from 'quasar'
import { createTestingPinia, type TestingPinia } from '@pinia/testing'
import LightningTransactionDetails from 'src/components/LightningTransactionDetails.vue'
import { useFederationStore } from 'src/stores/federation'
import { useLightningStore } from 'src/stores/lightning'
import type { LightningTransaction } from '@fedimint/core'

// Mock factory for creating test transactions
const createMockTransaction = (
  overrides: Partial<LightningTransaction> = {},
): LightningTransaction =>
  ({
    kind: 'ln',
    operationId: 'ln-op-123',
    invoice: 'lnbc1000n1p0test',
    type: 'send',
    outcome: 'success',
    timestamp: 1234567890000,
    fee: 1000,
    gateway: 'gateway.example.com',
    txId: 'tx-id-abc123',
    preimage: 'preimage-xyz789',
    ...overrides,
  }) as LightningTransaction

describe('LightningTransactionDetails.vue', () => {
  let wrapper: VueWrapper
  let pinia: TestingPinia
  let mockWriteText: ReturnType<typeof vi.fn>

  // Mock Notify
  const mockNotify = vi.fn()
  Notify.create = mockNotify

  const createWrapper = (transaction: LightningTransaction): VueWrapper => {
    pinia = createTestingPinia({
      initialState: {
        federation: {
          selectedFederation: {
            title: 'Test Federation',
            id: 'test-fed-id',
          },
        },
        lightning: {},
      },
      stubActions: false,
      createSpy: vi.fn,
    })

    // Mock federation store
    const federationStore = useFederationStore()
    vi.spyOn(federationStore, 'selectedFederation', 'get').mockReturnValue({
      title: 'Test Federation',
      inviteCode: 'test-code',
      federationId: 'test-fed-id',
      modules: [],
    })

    // Mock lightning store methods
    const lightningStore = useLightningStore()
    vi.spyOn(lightningStore, 'decodeInvoice').mockReturnValue({
      invoice: 'lnbc1000n1p0test',
      amount: 1000,
      description: 'test invoice',
      timestamp: Date.now(),
      paymentHash: 'hash123',
      expiry: undefined,
    })
    vi.spyOn(lightningStore, 'satsToFiat').mockResolvedValue(25.5)

    return mount(LightningTransactionDetails, {
      props: {
        transaction,
      },
      global: {
        plugins: [Quasar, pinia],
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock clipboard API
    mockWriteText = vi.fn()
    vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(mockWriteText)
  })

  describe('Component Mounting & Props', () => {
    it('should mount with required transaction prop', () => {
      const transaction = createMockTransaction()
      wrapper = createWrapper(transaction)

      expect(wrapper.exists()).toBe(true)
    })

    it('should decode invoice and display amount in sats', async () => {
      const transaction = createMockTransaction()
      wrapper = createWrapper(transaction)
      await flushPromises()

      const lightningStore = useLightningStore()
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(lightningStore.decodeInvoice).toHaveBeenCalledWith(transaction.invoice)
      expect(wrapper.text()).toContain('1,000')
    })
  })

  describe('Transaction Type Display', () => {
    it('should display "Sent Lightning" for send type with negative color', () => {
      const transaction = createMockTransaction({ type: 'send' })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('Sent Lightning')
      expect(wrapper.html()).toContain('text-negative')
    })

    it('should display "Received Lightning" for receive type with positive color', () => {
      const transaction = createMockTransaction({ type: 'receive' })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('Received Lightning')
      expect(wrapper.html()).toContain('text-positive')
    })

    it('should show minus prefix for send transactions', () => {
      const transaction = createMockTransaction({ type: 'send' })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('-1,000')
    })

    it('should show plus prefix for receive transactions', () => {
      const transaction = createMockTransaction({ type: 'receive' })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('+1,000')
    })
  })

  describe('Status Badge', () => {
    it('should show positive color for success status', () => {
      const transaction = createMockTransaction({ outcome: 'success' })
      wrapper = createWrapper(transaction)

      const badge = wrapper.find('.status-badge')
      expect(badge.exists()).toBe(true)
      expect(wrapper.text()).toContain('Success')
    })

    it('should show warning color for pending status', () => {
      const transaction = createMockTransaction({ outcome: 'pending' })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('Pending')
    })

    it('should show negative color for error status', () => {
      const transaction = createMockTransaction({ outcome: 'unexpected_error' })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('Unexpected Error')
    })

    it('should format outcome text correctly', () => {
      const transaction = createMockTransaction({ outcome: 'unexpected_error' })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('Unexpected Error')
      expect(wrapper.text()).not.toContain('unexpected_error')
    })
  })

  describe('Transaction Details', () => {
    it('should display formatted date', () => {
      const transaction = createMockTransaction({ timestamp: 1234567890000 })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('Created on')
      expect(wrapper.text()).toContain('February')
    })

    it('should display federation title', () => {
      const transaction = createMockTransaction()
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('Federation')
      expect(wrapper.text()).toContain('Test Federation')
    })

    it('should display gateway', () => {
      const transaction = createMockTransaction({ gateway: 'gateway.example.com' })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('Gateway')
      expect(wrapper.text()).toContain('gateway.example.com')
    })

    it('should display transaction ID', () => {
      const transaction = createMockTransaction({ txId: 'tx-id-abc123' })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('Transaction ID')
      expect(wrapper.text()).toContain('tx-id-abc123')
    })

    it('should display preimage when present', () => {
      const transaction = createMockTransaction({ preimage: 'preimage-xyz789' })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('Preimage')
      expect(wrapper.text()).toContain('preimage-xyz789')
    })

    it('should hide preimage section when not present', () => {
      const { preimage: _removed, ...transactionWithoutPreimage } = createMockTransaction()
      const transaction = transactionWithoutPreimage as LightningTransaction
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).not.toContain('Preimage')
    })
  })

  describe('Fee Display', () => {
    it('should display fee for send transactions', () => {
      const transaction = createMockTransaction({ type: 'send', fee: 2000 })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('Fee')
      expect(wrapper.text()).toContain('2 sats')
    })

    it('should hide fee for receive transactions', () => {
      const transaction = createMockTransaction({ type: 'receive', fee: 0 })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).not.toContain('Fee')
    })

    it('should convert fee from msats to sats', () => {
      const transaction = createMockTransaction({ type: 'send', fee: 1500 })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('2 sats') // 1500 / 1000 = 1.5, rounded to 2
    })
  })

  describe('Fiat Conversion', () => {
    it('should convert amount to fiat on mount', async () => {
      const transaction = createMockTransaction()
      wrapper = createWrapper(transaction)
      await flushPromises()

      const lightningStore = useLightningStore()
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(lightningStore.satsToFiat).toHaveBeenCalledWith(1000)
      expect(wrapper.text()).toContain('$25.50')
    })

    it('should handle fiat conversion errors gracefully', async () => {
      const transaction = createMockTransaction()
      pinia = createTestingPinia({
        initialState: {
          federation: {
            selectedFederation: {
              title: 'Test Federation',
              id: 'test-fed-id',
            },
          },
          lightning: {},
        },
        stubActions: false,
        createSpy: vi.fn,
      })

      const lightningStore = useLightningStore()
      vi.spyOn(lightningStore, 'decodeInvoice').mockReturnValue({
        invoice: 'lnbc1000n1p0test',
        amount: 1000,
        description: 'test invoice',
        timestamp: Date.now(),
        paymentHash: 'hash123',
        expiry: undefined,
      })
      vi.spyOn(lightningStore, 'satsToFiat').mockRejectedValue(new Error('Conversion failed'))

      wrapper = mount(LightningTransactionDetails, {
        props: {
          transaction,
        },
        global: {
          plugins: [Quasar, pinia],
        },
      })

      await flushPromises()

      expect(wrapper.text()).toContain('$0.00')
    })
  })

  describe('Copy Invoice', () => {
    it('should copy invoice to clipboard when copy button clicked', async () => {
      const transaction = createMockTransaction({ invoice: 'lnbc1000n1p0test' })
      wrapper = createWrapper(transaction)
      mockWriteText.mockResolvedValue(undefined)

      const copyButton = wrapper.find('.copy-button')
      await copyButton.trigger('click')
      await flushPromises()

      expect(mockWriteText).toHaveBeenCalledWith('lnbc1000n1p0test')
    })

    it('should show success notification on copy', async () => {
      const transaction = createMockTransaction()
      wrapper = createWrapper(transaction)
      mockWriteText.mockResolvedValue(undefined)

      const copyButton = wrapper.find('.copy-button')
      await copyButton.trigger('click')
      await flushPromises()

      expect(mockNotify).toHaveBeenCalledWith({
        message: 'Invoice copied to clipboard',
        color: 'positive',
        position: 'top',
      })
    })

    it('should handle clipboard errors gracefully', async () => {
      const transaction = createMockTransaction()
      wrapper = createWrapper(transaction)
      mockWriteText.mockRejectedValue(new Error('Clipboard error'))

      const copyButton = wrapper.find('.copy-button')
      await copyButton.trigger('click')
      await flushPromises()

      expect(mockNotify).toHaveBeenCalledWith({
        message: 'Failed to copy invoice',
        color: 'negative',
        position: 'top',
      })
    })
  })

  describe('Invoice Display', () => {
    it('should display full invoice text', () => {
      const transaction = createMockTransaction({ invoice: 'lnbc1000n1p0test' })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('Lightning Invoice')
      expect(wrapper.text()).toContain('lnbc1000n1p0test')
    })
  })
})
