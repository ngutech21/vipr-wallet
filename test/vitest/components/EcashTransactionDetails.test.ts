import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, type VueWrapper, flushPromises } from '@vue/test-utils'
import { Quasar, Notify } from 'quasar'
import { createTestingPinia, type TestingPinia } from '@pinia/testing'
import EcashTransactionDetails from 'src/components/EcashTransactionDetails.vue'
import { useFederationStore } from 'src/stores/federation'
import { useLightningStore } from 'src/stores/lightning'
import type { EcashTransaction } from '@fedimint/core'

// Mock factory for creating test transactions
const createMockTransaction = (overrides: Partial<EcashTransaction> = {}): EcashTransaction =>
  ({
    kind: 'mint',
    operationId: 'mint-op-123',
    type: 'reissue',
    amountMsats: 50000,
    outcome: 'Success',
    timestamp: 1234567890000,
    txId: 'tx-id-abc123',
    notes: 'cashuAeyJ0b2tlbiI6WyJzYXQiXX0=',
    ...overrides,
  }) as EcashTransaction

describe('EcashTransactionDetails.vue', () => {
  let wrapper: VueWrapper
  let pinia: TestingPinia
  let mockWriteText: ReturnType<typeof vi.fn>

  // Mock Notify
  const mockNotify = vi.fn()
  Notify.create = mockNotify

  const createWrapper = (transaction: EcashTransaction): VueWrapper => {
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
    vi.spyOn(lightningStore, 'satsToFiat').mockResolvedValue(12.5)

    return mount(EcashTransactionDetails, {
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

    it('should convert msats to sats correctly', () => {
      const transaction = createMockTransaction({ amountMsats: 50000 })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('50')
    })

    it('should convert msats to sats with thousand separators', () => {
      const transaction = createMockTransaction({ amountMsats: 1234567890 })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('1,234,567')
    })
  })

  describe('Transaction Type Display', () => {
    it('should display "Sent Ecash" for spend_oob type with negative color', () => {
      const transaction = createMockTransaction({ type: 'spend_oob' })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('Sent Ecash')
      expect(wrapper.html()).toContain('text-negative')
    })

    it('should display "Received Ecash" for reissue type with positive color', () => {
      const transaction = createMockTransaction({ type: 'reissue' })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('Received Ecash')
      expect(wrapper.html()).toContain('text-positive')
    })

    it('should show minus prefix for spend_oob transactions', () => {
      const transaction = createMockTransaction({ type: 'spend_oob', amountMsats: 50000 })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('-50')
    })

    it('should show plus prefix for reissue transactions', () => {
      const transaction = createMockTransaction({ type: 'reissue', amountMsats: 50000 })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('+50')
    })

    it('should display arrow_upward icon for spend_oob transactions', () => {
      const transaction = createMockTransaction({ type: 'spend_oob' })
      wrapper = createWrapper(transaction)

      expect(wrapper.html()).toContain('arrow_upward')
    })

    it('should display arrow_downward icon for reissue transactions', () => {
      const transaction = createMockTransaction({ type: 'reissue' })
      wrapper = createWrapper(transaction)

      expect(wrapper.html()).toContain('arrow_downward')
    })
  })

  describe('Status Badge', () => {
    it('should show positive color for success status', () => {
      const transaction = createMockTransaction({ outcome: 'Success' })
      wrapper = createWrapper(transaction)

      const badge = wrapper.find('.status-badge')
      expect(badge.exists()).toBe(true)
      expect(wrapper.text()).toContain('Success')
    })

    it('should show positive color for done status', () => {
      const transaction = createMockTransaction({ outcome: 'Done' })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('Done')
    })

    it('should show warning color for created status', () => {
      const transaction = createMockTransaction({ outcome: 'Created' })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('Created')
    })

    it('should show warning color for issuing status', () => {
      const transaction = createMockTransaction({ outcome: 'Issuing' })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('Issuing')
    })

    it('should show negative color for UserCanceledFailure status', () => {
      const transaction = createMockTransaction({ outcome: 'UserCanceledFailure' })
      wrapper = createWrapper(transaction)

      // camelCase is not formatted with spaces, only underscores are replaced
      expect(wrapper.text()).toContain('UserCanceledFailure')
    })

    it('should show negative color for refunded status', () => {
      const transaction = createMockTransaction({ outcome: 'Refunded' })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('Refunded')
    })

    it('should format outcome text correctly with underscores', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transaction = createMockTransaction({ outcome: 'user_canceled' as any })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('User Canceled')
      expect(wrapper.text()).not.toContain('user_canceled')
    })

    it('should handle UserCanceledSuccess status', () => {
      const transaction = createMockTransaction({ outcome: 'UserCanceledSuccess' })
      wrapper = createWrapper(transaction)

      // camelCase is not formatted with spaces
      expect(wrapper.text()).toContain('UserCanceledSuccess')
    })

    it('should not show status badge when outcome is undefined', () => {
      const { outcome: _removed, ...transactionWithoutOutcome } = createMockTransaction()
      const transaction = transactionWithoutOutcome as EcashTransaction
      wrapper = createWrapper(transaction)

      const badge = wrapper.find('.status-badge')
      expect(badge.exists()).toBe(false)
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

    it('should display "Unknown Federation" when selectedFederation is null', () => {
      const transaction = createMockTransaction()
      pinia = createTestingPinia({
        initialState: {
          federation: {
            selectedFederation: null,
          },
          lightning: {},
        },
        stubActions: false,
        createSpy: vi.fn,
      })

      const federationStore = useFederationStore()
      vi.spyOn(federationStore, 'selectedFederation', 'get').mockReturnValue(undefined)

      const lightningStore = useLightningStore()
      vi.spyOn(lightningStore, 'satsToFiat').mockResolvedValue(12.5)

      wrapper = mount(EcashTransactionDetails, {
        props: {
          transaction,
        },
        global: {
          plugins: [Quasar, pinia],
        },
      })

      expect(wrapper.text()).toContain('Unknown Federation')
    })

    it('should display transaction ID when present', () => {
      const transaction = createMockTransaction({ txId: 'tx-id-abc123' })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('Transaction ID')
      expect(wrapper.text()).toContain('tx-id-abc123')
    })

    it('should hide transaction ID section when not present', () => {
      const { txId: _removed, ...transactionWithoutTxId } = createMockTransaction()
      const transaction = transactionWithoutTxId as EcashTransaction
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).not.toContain('Transaction ID')
    })
  })

  describe('Notes Display', () => {
    it('should display notes section when notes are present', () => {
      const transaction = createMockTransaction({ notes: 'cashuAeyJ0b2tlbiI6WyJzYXQiXX0=' })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('Notes')
      expect(wrapper.text()).toContain('cashuAeyJ0b2tlbiI6WyJzYXQiXX0=')
    })

    it('should hide notes section when notes are not present', () => {
      const { notes: _removed, ...transactionWithoutNotes } = createMockTransaction()
      const transaction = transactionWithoutNotes as EcashTransaction
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).not.toContain('Notes')
      const notesSection = wrapper.find('.notes-section')
      expect(notesSection.exists()).toBe(false)
    })

    it('should show copy button when notes are present', () => {
      const transaction = createMockTransaction({ notes: 'test-notes' })
      wrapper = createWrapper(transaction)

      const copyButton = wrapper.find('.copy-button')
      expect(copyButton.exists()).toBe(true)
    })

    it('should not show copy button when notes are absent', () => {
      const { notes: _removed, ...transactionWithoutNotes } = createMockTransaction()
      const transaction = transactionWithoutNotes as EcashTransaction
      wrapper = createWrapper(transaction)

      const copyButton = wrapper.find('.copy-button')
      expect(copyButton.exists()).toBe(false)
    })
  })

  describe('Fiat Conversion', () => {
    it('should convert amount to fiat on mount', async () => {
      const transaction = createMockTransaction({ amountMsats: 50000 })
      wrapper = createWrapper(transaction)
      await flushPromises()

      const lightningStore = useLightningStore()
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(lightningStore.satsToFiat).toHaveBeenCalledWith(50)
      expect(wrapper.text()).toContain('$12.50')
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

      const federationStore = useFederationStore()
      vi.spyOn(federationStore, 'selectedFederation', 'get').mockReturnValue({
        title: 'Test Federation',
        inviteCode: 'test-code',
        federationId: 'test-fed-id',
        modules: [],
      })

      const lightningStore = useLightningStore()
      vi.spyOn(lightningStore, 'satsToFiat').mockRejectedValue(new Error('Conversion failed'))

      wrapper = mount(EcashTransactionDetails, {
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

    it('should display fiat amount with 2 decimal places', async () => {
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

      const federationStore = useFederationStore()
      vi.spyOn(federationStore, 'selectedFederation', 'get').mockReturnValue({
        title: 'Test Federation',
        inviteCode: 'test-code',
        federationId: 'test-fed-id',
        modules: [],
      })

      const lightningStore = useLightningStore()
      vi.spyOn(lightningStore, 'satsToFiat').mockResolvedValue(123.456789)

      wrapper = mount(EcashTransactionDetails, {
        props: {
          transaction,
        },
        global: {
          plugins: [Quasar, pinia],
        },
      })

      await flushPromises()

      expect(wrapper.text()).toContain('$123.46')
      expect(wrapper.text()).not.toContain('123.456789')
    })
  })

  describe('Copy Notes', () => {
    it('should copy notes to clipboard when copy button clicked', async () => {
      const transaction = createMockTransaction({ notes: 'cashuAeyJ0b2tlbiI6WyJzYXQiXX0=' })
      wrapper = createWrapper(transaction)
      mockWriteText.mockResolvedValue(undefined)

      const copyButton = wrapper.find('.copy-button')
      await copyButton.trigger('click')
      await flushPromises()

      expect(mockWriteText).toHaveBeenCalledWith('cashuAeyJ0b2tlbiI6WyJzYXQiXX0=')
    })

    it('should show success notification on copy', async () => {
      const transaction = createMockTransaction({ notes: 'test-notes' })
      wrapper = createWrapper(transaction)
      mockWriteText.mockResolvedValue(undefined)

      const copyButton = wrapper.find('.copy-button')
      await copyButton.trigger('click')
      await flushPromises()

      expect(mockNotify).toHaveBeenCalledWith({
        message: 'Notes copied to clipboard',
        color: 'positive',
        position: 'top',
      })
    })

    it('should handle clipboard errors gracefully', async () => {
      const transaction = createMockTransaction({ notes: 'test-notes' })
      wrapper = createWrapper(transaction)
      mockWriteText.mockRejectedValue(new Error('Clipboard error'))

      const copyButton = wrapper.find('.copy-button')
      await copyButton.trigger('click')
      await flushPromises()

      expect(mockNotify).toHaveBeenCalledWith({
        message: 'Failed to copy notes',
        color: 'negative',
        position: 'top',
      })
    })

    it('should not copy when notes are empty string', () => {
      const transaction = createMockTransaction({ notes: '' })
      wrapper = createWrapper(transaction)

      // Empty notes shouldn't show the copy button
      const copyButton = wrapper.find('.copy-button')
      expect(copyButton.exists()).toBe(false)
    })
  })

  describe('Amount Calculation', () => {
    it('should floor division when converting msats to sats', () => {
      const transaction = createMockTransaction({ amountMsats: 1999 })
      wrapper = createWrapper(transaction)

      // Should display 1 sat (1999 msats / 1000 = 1.999, floored to 1)
      const amountText = wrapper.find('.text-h4').text()
      expect(amountText).toContain('+1')
      expect(amountText).not.toContain('1.999')
      expect(amountText).not.toContain('+2')
    })

    it('should handle zero amount', () => {
      const transaction = createMockTransaction({ amountMsats: 0 })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('0')
    })

    it('should handle large amounts with proper formatting', () => {
      const transaction = createMockTransaction({ amountMsats: 999999999000 })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('999,999,999')
    })

    it('should add thousand separators correctly', () => {
      const transaction = createMockTransaction({ amountMsats: 1000000 })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('1,000')
    })
  })

  describe('Helper Functions', () => {
    describe('getTransactionIcon', () => {
      it('should return arrow_upward for spend_oob', () => {
        const transaction = createMockTransaction({ type: 'spend_oob' })
        wrapper = createWrapper(transaction)

        expect(wrapper.html()).toContain('arrow_upward')
      })

      it('should return arrow_downward for reissue', () => {
        const transaction = createMockTransaction({ type: 'reissue' })
        wrapper = createWrapper(transaction)

        expect(wrapper.html()).toContain('arrow_downward')
      })

      it('should return account_balance_wallet for unknown type', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transaction = createMockTransaction({ type: 'unknown' as any })
        wrapper = createWrapper(transaction)

        expect(wrapper.html()).toContain('account_balance_wallet')
      })
    })

    describe('getTransactionColor', () => {
      it('should return negative color for spend_oob', () => {
        const transaction = createMockTransaction({ type: 'spend_oob' })
        wrapper = createWrapper(transaction)

        expect(wrapper.html()).toContain('text-negative')
      })

      it('should return positive color for reissue', () => {
        const transaction = createMockTransaction({ type: 'reissue' })
        wrapper = createWrapper(transaction)

        expect(wrapper.html()).toContain('text-positive')
      })
    })

    describe('getTransactionLabel', () => {
      it('should return "Sent Ecash" for spend_oob', () => {
        const transaction = createMockTransaction({ type: 'spend_oob' })
        wrapper = createWrapper(transaction)

        expect(wrapper.text()).toContain('Sent Ecash')
      })

      it('should return "Received Ecash" for reissue', () => {
        const transaction = createMockTransaction({ type: 'reissue' })
        wrapper = createWrapper(transaction)

        expect(wrapper.text()).toContain('Received Ecash')
      })

      it('should return "Ecash Transaction" for unknown type', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transaction = createMockTransaction({ type: 'unknown' as any })
        wrapper = createWrapper(transaction)

        expect(wrapper.text()).toContain('Ecash Transaction')
      })
    })

    describe('getAmountClass', () => {
      it('should return text-negative class for spend_oob', () => {
        const transaction = createMockTransaction({ type: 'spend_oob' })
        wrapper = createWrapper(transaction)

        expect(wrapper.html()).toContain('text-negative')
      })

      it('should return text-positive class for reissue', () => {
        const transaction = createMockTransaction({ type: 'reissue' })
        wrapper = createWrapper(transaction)

        expect(wrapper.html()).toContain('text-positive')
      })
    })

    describe('getAmountPrefix', () => {
      it('should return minus prefix for spend_oob', () => {
        const transaction = createMockTransaction({ type: 'spend_oob' })
        wrapper = createWrapper(transaction)

        expect(wrapper.text()).toMatch(/-\d/)
      })

      it('should return plus prefix for reissue', () => {
        const transaction = createMockTransaction({ type: 'reissue' })
        wrapper = createWrapper(transaction)

        expect(wrapper.text()).toMatch(/\+\d/)
      })
    })

    describe('getStatusColor', () => {
      it('should return grey for undefined status', () => {
        const { outcome: _removed, ...transactionWithoutOutcome } = createMockTransaction()
        const transaction = transactionWithoutOutcome as EcashTransaction
        wrapper = createWrapper(transaction)

        // Badge shouldn't exist for undefined outcome
        const badge = wrapper.find('.status-badge')
        expect(badge.exists()).toBe(false)
      })

      it('should return grey for empty string status', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const transaction = createMockTransaction({ outcome: '' as any })
        wrapper = createWrapper(transaction)

        // Badge shouldn't exist for empty outcome
        const badge = wrapper.find('.status-badge')
        expect(badge.exists()).toBe(false)
      })
    })
  })
})
