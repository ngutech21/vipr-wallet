import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { Quasar } from 'quasar'
import { createTestingPinia, type TestingPinia } from '@pinia/testing'
import type { WalletTransaction } from '@fedimint/core'
import WalletTransactionItem from 'src/components/WalletTransactionItem.vue'
import { useLightningStore } from 'src/stores/lightning'

const createMockTransaction = (overrides: Partial<WalletTransaction> = {}): WalletTransaction => ({
  kind: 'wallet',
  operationId: 'wallet-op-123',
  type: 'deposit',
  onchainAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  amountMsats: 100000000,
  fee: 5000000,
  outcome: 'Confirmed',
  timestamp: 1234567890000,
  ...overrides,
})

describe('WalletTransactionItem.vue', () => {
  let wrapper: VueWrapper | undefined
  let pinia: TestingPinia

  const mountComponent = (transaction: WalletTransaction): VueWrapper => {
    return mount(WalletTransactionItem, {
      props: { transaction },
      global: {
        plugins: [Quasar, pinia],
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    pinia = createTestingPinia({
      initialState: {
        lightning: {},
      },
      stubActions: false,
      createSpy: vi.fn,
    })
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  it('converts msats to sats for fiat conversion and renders the fiat amount', async () => {
    const lightningStore = useLightningStore()
    const satsToFiatSpy = vi.spyOn(lightningStore, 'satsToFiat').mockResolvedValue(12.34)

    wrapper = mountComponent(createMockTransaction({ amountMsats: 100000000 }))
    await flushPromises()

    expect(satsToFiatSpy).toHaveBeenCalledWith(100000)
    expect(wrapper.text()).toContain('≈ $12.34 usd')
  })

  it('falls back to 0.00 when fiat conversion fails', async () => {
    const lightningStore = useLightningStore()
    vi.spyOn(lightningStore, 'satsToFiat').mockRejectedValue(new Error('fiat service down'))

    wrapper = mountComponent(createMockTransaction())
    await flushPromises()

    expect(wrapper.text()).toContain('≈ $0.00 usd')
  })

  it('recomputes fiat amount when transaction amount changes', async () => {
    const lightningStore = useLightningStore()
    const satsToFiatSpy = vi
      .spyOn(lightningStore, 'satsToFiat')
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(20)

    wrapper = mountComponent(createMockTransaction({ amountMsats: 100000000 }))
    await flushPromises()
    expect(wrapper.text()).toContain('≈ $10.00 usd')

    await wrapper.setProps({
      transaction: createMockTransaction({ operationId: 'wallet-op-456', amountMsats: 200000000 }),
    })
    await flushPromises()

    expect(satsToFiatSpy).toHaveBeenNthCalledWith(2, 200000)
    expect(wrapper.text()).toContain('≈ $20.00 usd')
  })

  it('shows a friendly waiting label for pending onchain deposits', async () => {
    const { outcome: _removed, ...transactionWithoutOutcome } = createMockTransaction({
      amountMsats: 0,
    })
    wrapper = mountComponent(transactionWithoutOutcome)
    await flushPromises()

    expect(wrapper.text()).toContain('Waiting for Bitcoin')
    expect(wrapper.text()).not.toContain('Deposited')
  })

  it('shows a friendly confirmed label for completed onchain deposits', async () => {
    wrapper = mountComponent(createMockTransaction({ outcome: 'Confirmed' }))
    await flushPromises()

    expect(wrapper.text()).toContain('Bitcoin received')
    expect(wrapper.text()).not.toContain('Deposited')
  })

  it('shows a processing status for pending onchain sends in the list', async () => {
    const { outcome: _removed, ...transactionWithoutOutcome } = createMockTransaction({
      type: 'withdraw',
    })
    wrapper = mountComponent(transactionWithoutOutcome)
    await flushPromises()

    expect(wrapper.text()).toContain('Processing')
    expect(wrapper.text()).not.toContain('Status:')
    expect(wrapper.text()).not.toContain('bc1qxy2k')
  })

  it('shows a broadcast status for completed onchain sends in the list', async () => {
    wrapper = mountComponent(createMockTransaction({ type: 'withdraw', outcome: 'Confirmed' }))
    await flushPromises()

    expect(wrapper.text()).toContain('Broadcast')
    expect(wrapper.text()).not.toContain('Status:')
    expect(wrapper.text()).not.toContain('bc1qxy2k')
  })

  it('shows a failed status for failed onchain sends in the list', async () => {
    wrapper = mountComponent(createMockTransaction({ type: 'withdraw', outcome: 'Failed' }))
    await flushPromises()

    expect(wrapper.text()).toContain('Failed')
    expect(wrapper.text()).not.toContain('Status:')
    expect(wrapper.text()).not.toContain('bc1qxy2k')
  })

  it('shows the withdraw fee without adding an extra total line', async () => {
    wrapper = mountComponent(
      createMockTransaction({ type: 'withdraw', amountMsats: 2_000_000, fee: 471_000 }),
    )
    await flushPromises()

    const normalizedText = wrapper.text().replace(/\s+/g, ' ').trim()

    expect(normalizedText).toContain('- 2,000 sats')
    expect(normalizedText).toContain('Fee 471 sats')
    expect(normalizedText).not.toContain('Total:')
  })

  it('shows an unknown amount when a withdraw has no recoverable sent amount', async () => {
    wrapper = mountComponent(
      createMockTransaction({ type: 'withdraw', amountMsats: 0, fee: 471_000 }),
    )
    await flushPromises()

    expect(wrapper.text()).toContain('Unknown')
    expect(wrapper.text()).toContain('Fee 471 sats')
    expect(wrapper.text()).not.toContain('Total:')
  })
})
