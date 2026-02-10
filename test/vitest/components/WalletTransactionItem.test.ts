import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { Quasar } from 'quasar'
import { createTestingPinia, type TestingPinia } from '@pinia/testing'
import type { WalletTransaction } from '@fedimint/core'
import WalletTransactionItem from 'src/components/WalletTransactionItem.vue'
import { useLightningStore } from 'src/stores/lightning'

const createMockTransaction = (overrides: Partial<WalletTransaction> = {}): WalletTransaction =>
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
})
