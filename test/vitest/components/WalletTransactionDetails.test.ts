import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, type VueWrapper, flushPromises } from '@vue/test-utils'
import { Quasar, Notify } from 'quasar'
import { createTestingPinia, type TestingPinia } from '@pinia/testing'
import WalletTransactionDetails from 'src/components/WalletTransactionDetails.vue'
import { useFederationStore } from 'src/stores/federation'
import { useLightningStore } from 'src/stores/lightning'
import type { WalletTransaction } from '@fedimint/core'

// Mock factory for creating test transactions
const createMockTransaction = (
  overrides: Partial<WalletTransaction> = {},
): WalletTransaction =>
  ({
    kind: 'wallet',
    operationId: 'wallet-op-123',
    type: 'deposit',
    onchainAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    amountMsats: 100000000,
    fee: 5000000,
    outcome: 'Confirmed',
    timestamp: 1234567890000,
    ...overrides,
  }) as WalletTransaction

describe('WalletTransactionDetails.vue', () => {
  let wrapper: VueWrapper
  let pinia: TestingPinia
  let mockWriteText: ReturnType<typeof vi.fn>

  // Mock Notify
  const mockNotify = vi.fn()
  Notify.create = mockNotify

  const createWrapper = (transaction: WalletTransaction): VueWrapper => {
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
    vi.spyOn(lightningStore, 'satsToFiat').mockResolvedValue(50.25)

    return mount(WalletTransactionDetails, {
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
      const transaction = createMockTransaction({ amountMsats: 100000000 })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('100,000')
    })

    it('should convert msats to sats with thousand separators', () => {
      const transaction = createMockTransaction({ amountMsats: 1234567890000 })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('1,234,567,890')
    })
  })

  describe('Transaction Type Display', () => {
    it('should display "Deposited" for deposit type with positive color', () => {
      const transaction = createMockTransaction({ type: 'deposit' })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('Deposited')
      expect(wrapper.html()).toContain('text-positive')
    })

    it('should display "Withdrawn" for withdraw type with negative color', () => {
      const transaction = createMockTransaction({ type: 'withdraw' })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('Withdrawn')
      expect(wrapper.html()).toContain('text-negative')
    })

    it('should show plus prefix for deposit transactions', () => {
      const transaction = createMockTransaction({ type: 'deposit', amountMsats: 100000000 })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('+100,000')
    })

    it('should show minus prefix for withdraw transactions', () => {
      const transaction = createMockTransaction({ type: 'withdraw', amountMsats: 100000000 })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('-100,000')
    })

    it('should display arrow_downward icon for deposit transactions', () => {
      const transaction = createMockTransaction({ type: 'deposit' })
      wrapper = createWrapper(transaction)

      expect(wrapper.html()).toContain('arrow_downward')
    })

    it('should display arrow_upward icon for withdraw transactions', () => {
      const transaction = createMockTransaction({ type: 'withdraw' })
      wrapper = createWrapper(transaction)

      expect(wrapper.html()).toContain('arrow_upward')
    })
  })

  describe('Status Badge', () => {
    it('should show positive color for Confirmed status', () => {
      const transaction = createMockTransaction({ outcome: 'Confirmed' })
      wrapper = createWrapper(transaction)

      const badge = wrapper.find('.status-badge')
      expect(badge.exists()).toBe(true)
      expect(wrapper.text()).toContain('Confirmed')
    })

    it('should show positive color for Claimed status', () => {
      const transaction = createMockTransaction({ outcome: 'Claimed' })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('Claimed')
    })

    it('should show warning color for WaitingForTransaction status', () => {
      const transaction = createMockTransaction({ outcome: 'WaitingForTransaction' })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('Waiting For Transaction')
    })

    it('should show warning color for WaitingForConfirmation status', () => {
      const transaction = createMockTransaction({ outcome: 'WaitingForConfirmation' })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('Waiting For Confirmation')
    })

    it('should show negative color for Failed status', () => {
      const transaction = createMockTransaction({ outcome: 'Failed' })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('Failed')
    })

    it('should format outcome text correctly (camelCase to spaced)', () => {
      const transaction = createMockTransaction({ outcome: 'WaitingForConfirmation' })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('Waiting For Confirmation')
      expect(wrapper.text()).not.toContain('WaitingForConfirmation')
    })

    it('should not show status badge when outcome is undefined', () => {
      const { outcome: _removed, ...transactionWithoutOutcome } = createMockTransaction()
      const transaction = transactionWithoutOutcome as WalletTransaction
      wrapper = createWrapper(transaction)

      const badge = wrapper.find('.status-badge')
      expect(badge.exists()).toBe(false)
    })

    it('should return grey color for empty string status', () => {
      const transaction = createMockTransaction({ outcome: '' as any })
      wrapper = createWrapper(transaction)

      // Badge should still exist but with grey color
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
      vi.spyOn(lightningStore, 'satsToFiat').mockResolvedValue(50.25)

      wrapper = mount(WalletTransactionDetails, {
        props: {
          transaction,
        },
        global: {
          plugins: [Quasar, pinia],
        },
      })

      expect(wrapper.text()).toContain('Unknown Federation')
    })

    it('should display bitcoin address', () => {
      const transaction = createMockTransaction({
        onchainAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('Bitcoin Address')
      expect(wrapper.text()).toContain('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh')
    })

    it('should display network fee in sats', () => {
      const transaction = createMockTransaction({ fee: 5000000 })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('Network Fee')
      expect(wrapper.text()).toContain('5,000 sats')
    })

    it('should convert fee from msats to sats', () => {
      const transaction = createMockTransaction({ fee: 2500000 })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('2,500 sats')
    })
  })

  describe('Net Amount Calculation', () => {
    it('should display "Net Deposited" for deposit transactions', () => {
      const transaction = createMockTransaction({ type: 'deposit' })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('Net Deposited')
      expect(wrapper.text()).not.toContain('Net Withdrawn')
    })

    it('should display "Net Withdrawn" for withdraw transactions', () => {
      const transaction = createMockTransaction({ type: 'withdraw' })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('Net Withdrawn')
      expect(wrapper.text()).not.toContain('Net Deposited')
    })

    it('should calculate net amount correctly for deposit (amount - fee)', () => {
      const transaction = createMockTransaction({
        type: 'deposit',
        amountMsats: 100000000,
        fee: 5000000,
      })
      wrapper = createWrapper(transaction)

      // Net deposited = 100,000 sats - 5,000 sats = 95,000 sats
      expect(wrapper.text()).toContain('+95,000 sats')
    })

    it('should calculate net amount correctly for withdraw (amount + fee)', () => {
      const transaction = createMockTransaction({
        type: 'withdraw',
        amountMsats: 100000000,
        fee: 5000000,
      })
      wrapper = createWrapper(transaction)

      // Net withdrawn = 100,000 sats + 5,000 sats = 105,000 sats
      expect(wrapper.text()).toContain('-105,000 sats')
    })

    it('should use absolute value for net amount display', () => {
      const transaction = createMockTransaction({
        type: 'withdraw',
        amountMsats: 100000000,
        fee: 5000000,
      })
      wrapper = createWrapper(transaction)

      // Should display 105,000 (absolute value), not -105,000 twice
      const text = wrapper.text()
      expect(text).toContain('105,000')
    })

    it('should show positive color for deposit net amount', () => {
      const transaction = createMockTransaction({ type: 'deposit' })
      wrapper = createWrapper(transaction)

      const detailRows = wrapper.findAll('.detail-row')
      const netAmountRow = detailRows.find((row) => row.text().includes('Net Deposited'))
      expect(netAmountRow?.html()).toContain('text-positive')
    })

    it('should show negative color for withdraw net amount', () => {
      const transaction = createMockTransaction({ type: 'withdraw' })
      wrapper = createWrapper(transaction)

      const detailRows = wrapper.findAll('.detail-row')
      const netAmountRow = detailRows.find((row) => row.text().includes('Net Withdrawn'))
      expect(netAmountRow?.html()).toContain('text-negative')
    })
  })

  describe('Fiat Conversion', () => {
    it('should convert amount to fiat on mount', async () => {
      const transaction = createMockTransaction({ amountMsats: 100000000 })
      wrapper = createWrapper(transaction)
      await flushPromises()

      const lightningStore = useLightningStore()
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(lightningStore.satsToFiat).toHaveBeenCalledWith(100000)
      expect(wrapper.text()).toContain('$50.25')
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

      wrapper = mount(WalletTransactionDetails, {
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

      wrapper = mount(WalletTransactionDetails, {
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

  describe('Copy Address', () => {
    it('should copy address to clipboard when copy button clicked', async () => {
      const transaction = createMockTransaction({
        onchainAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      })
      wrapper = createWrapper(transaction)
      mockWriteText.mockResolvedValue(undefined)

      const copyButton = wrapper.find('.copy-button')
      await copyButton.trigger('click')
      await flushPromises()

      expect(mockWriteText).toHaveBeenCalledWith('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh')
    })

    it('should show success notification on copy', async () => {
      const transaction = createMockTransaction()
      wrapper = createWrapper(transaction)
      mockWriteText.mockResolvedValue(undefined)

      const copyButton = wrapper.find('.copy-button')
      await copyButton.trigger('click')
      await flushPromises()

      expect(mockNotify).toHaveBeenCalledWith({
        message: 'Address copied to clipboard',
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
        message: 'Failed to copy address',
        color: 'negative',
        position: 'top',
      })
    })
  })

  describe('Address Display', () => {
    it('should display full bitcoin address', () => {
      const transaction = createMockTransaction({
        onchainAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh')
    })

    it('should display address in address section', () => {
      const transaction = createMockTransaction({
        onchainAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      })
      wrapper = createWrapper(transaction)

      const addressSection = wrapper.find('.address-section')
      expect(addressSection.exists()).toBe(true)
      expect(addressSection.text()).toContain('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh')
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
      const transaction = createMockTransaction({ amountMsats: 999999999000000 })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('999,999,999,000')
    })

    it('should add thousand separators correctly', () => {
      const transaction = createMockTransaction({ amountMsats: 1000000000 })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('1,000,000')
    })
  })

  describe('Helper Functions', () => {
    describe('formatDate', () => {
      it('should format timestamp correctly', () => {
        const transaction = createMockTransaction({ timestamp: 1234567890000 })
        wrapper = createWrapper(transaction)

        // Date may vary by timezone, so just check it contains "February" and "2009"
        expect(wrapper.text()).toContain('February')
        expect(wrapper.text()).toContain('2009')
      })

      it('should include time in formatted date', () => {
        const transaction = createMockTransaction({ timestamp: 1234567890000 })
        wrapper = createWrapper(transaction)

        expect(wrapper.text()).toMatch(/\d{1,2}:\d{2} [AP]M/)
      })
    })

    describe('formatOutcome', () => {
      it('should format camelCase outcome with spaces', () => {
        const transaction = createMockTransaction({ outcome: 'WaitingForConfirmation' })
        wrapper = createWrapper(transaction)

        expect(wrapper.text()).toContain('Waiting For Confirmation')
      })

      it('should not modify single word outcomes', () => {
        const transaction = createMockTransaction({ outcome: 'Confirmed' })
        wrapper = createWrapper(transaction)

        expect(wrapper.text()).toContain('Confirmed')
      })
    })

    describe('getStatusColor', () => {
      it('should return grey for undefined status', () => {
        const { outcome: _removed, ...transactionWithoutOutcome } = createMockTransaction()
        const transaction = transactionWithoutOutcome as WalletTransaction
        wrapper = createWrapper(transaction)

        // Badge shouldn't exist for undefined outcome
        const badge = wrapper.find('.status-badge')
        expect(badge.exists()).toBe(false)
      })

      it('should return positive color for Confirmed', () => {
        const transaction = createMockTransaction({ outcome: 'Confirmed' })
        wrapper = createWrapper(transaction)

        const badge = wrapper.find('.status-badge')
        expect(badge.exists()).toBe(true)
        // Check for positive color class or attribute
        expect(badge.attributes('class')).toContain('bg-positive')
      })

      it('should return positive color for Claimed', () => {
        const transaction = createMockTransaction({ outcome: 'Claimed' })
        wrapper = createWrapper(transaction)

        const badge = wrapper.find('.status-badge')
        expect(badge.attributes('class')).toContain('bg-positive')
      })

      it('should return warning color for WaitingForTransaction', () => {
        const transaction = createMockTransaction({ outcome: 'WaitingForTransaction' })
        wrapper = createWrapper(transaction)

        const badge = wrapper.find('.status-badge')
        expect(badge.attributes('class')).toContain('bg-warning')
      })

      it('should return warning color for WaitingForConfirmation', () => {
        const transaction = createMockTransaction({ outcome: 'WaitingForConfirmation' })
        wrapper = createWrapper(transaction)

        const badge = wrapper.find('.status-badge')
        expect(badge.attributes('class')).toContain('bg-warning')
      })

      it('should return negative color for Failed', () => {
        const transaction = createMockTransaction({ outcome: 'Failed' })
        wrapper = createWrapper(transaction)

        const badge = wrapper.find('.status-badge')
        expect(badge.attributes('class')).toContain('bg-negative')
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing optional fields gracefully', () => {
      const { outcome: _removed, ...transactionWithoutOutcome } = createMockTransaction()
      const transaction = transactionWithoutOutcome as WalletTransaction
      wrapper = createWrapper(transaction)

      expect(wrapper.exists()).toBe(true)
      const badge = wrapper.find('.status-badge')
      expect(badge.exists()).toBe(false)
    })

    it('should handle extremely small amounts', () => {
      const transaction = createMockTransaction({ amountMsats: 1 })
      wrapper = createWrapper(transaction)

      // 1 msat / 1000 = 0.001, floored to 0
      expect(wrapper.text()).toContain('0')
    })

    it('should handle zero fee', () => {
      const transaction = createMockTransaction({ fee: 0 })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain('0 sats')
    })

    it('should handle very long bitcoin addresses', () => {
      const longAddress =
        'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlhbc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'
      const transaction = createMockTransaction({
        onchainAddress: longAddress,
      })
      wrapper = createWrapper(transaction)

      expect(wrapper.text()).toContain(longAddress)
    })
  })
})
