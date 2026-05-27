import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { defineComponent } from 'vue'
import type { LightningTransaction } from '@fedimint/core'
import LightningTransactionItem from 'src/components/LightningTransactionItem.vue'
import { useLightningStore } from 'src/stores/lightning'
import { PassthroughStub } from '../mocks/quasar-stubs'
import type { Bolt11Invoice } from 'src/types/lightning'

vi.mock('quasar', async (importOriginal) => {
  const actual = await importOriginal()
  return Object.assign({}, actual, {
    Ripple: {
      beforeMount: () => undefined,
      mounted: () => undefined,
      updated: () => undefined,
      unmounted: () => undefined,
    },
  })
})

const QItemStub = defineComponent({
  name: 'QItem',
  emits: ['click'],
  template: '<button v-bind="$attrs" type="button" @click="$emit(\'click\')"><slot /></button>',
})

function createTransaction(overrides: Partial<LightningTransaction> = {}): LightningTransaction {
  return {
    kind: 'ln',
    operationId: 'ln-op-1',
    type: 'send',
    invoice: 'lnbc1invoice',
    outcome: 'success',
    gateway: 'gateway-1',
    txId: 'tx-1',
    fee: 0,
    timestamp: 1_234_567_890_000,
    ...overrides,
  }
}

function mountComponent(
  transaction: LightningTransaction,
  options: {
    decodeInvoice?: (invoice: string) => Bolt11Invoice
  } = {},
) {
  const pinia = createTestingPinia({
    stubActions: false,
    createSpy: vi.fn,
  })
  const lightningStore = useLightningStore()
  const decodeInvoice = vi.spyOn(lightningStore, 'decodeInvoice').mockImplementation(
    options.decodeInvoice ??
      vi.fn(() => ({
        invoice: transaction.invoice,
        amount: 1_234,
        description: 'Test invoice',
        paymentHash: 'hash',
        timestamp: 1_234_567_890,
        expiry: undefined,
      })),
  )
  const satsToFiat = vi.spyOn(lightningStore, 'satsToFiat').mockResolvedValue(12.34)

  const wrapper = mount(LightningTransactionItem, {
    props: {
      transaction,
    },
    global: {
      plugins: [pinia],
      directives: {
        ripple: {},
      },
      stubs: {
        TransactionRailIcon: true,
        'q-item': QItemStub,
        'q-item-section': PassthroughStub,
        'q-item-label': PassthroughStub,
        'q-icon': true,
      },
    },
  })

  return { wrapper, decodeInvoice, satsToFiat }
}

describe('LightningTransactionItem.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders decoded invoice amount and converts that same sats value to fiat', async () => {
    const transaction = createTransaction()
    const { wrapper, decodeInvoice, satsToFiat } = mountComponent(transaction)
    await flushPromises()

    expect(wrapper.text()).toContain('Sent Lightning')
    expect(wrapper.text()).toMatch(/-\s+1,234 sats/)
    expect(wrapper.text()).toContain('≈ $12.34 usd')
    expect(decodeInvoice).toHaveBeenCalledWith(transaction.invoice)
    expect(satsToFiat).toHaveBeenCalledWith(1_234)
  })

  it('emits the operation id when selected', async () => {
    const transaction = createTransaction({ operationId: 'ln-op-click' })
    const { wrapper } = mountComponent(transaction)

    await wrapper.get('[data-testid="lightning-transaction-item-ln-op-click"]').trigger('click')

    expect(wrapper.emitted('click')).toEqual([['ln-op-click']])
  })

  it('falls back cleanly when invoice decoding fails', async () => {
    const transaction = createTransaction({ type: 'receive' })
    const { wrapper, satsToFiat } = mountComponent(transaction, {
      decodeInvoice: vi.fn(() => {
        throw new Error('bad invoice')
      }),
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Received Lightning')
    expect(wrapper.text()).toMatch(/\+\s+0 sats/)
    expect(wrapper.text()).toContain('≈ $0.00 usd')
    expect(satsToFiat).not.toHaveBeenCalled()
  })

  it('renders restored event log amount without decoding an invoice', async () => {
    const transaction = createTransaction({
      invoice: '',
      type: 'receive',
      amountMsats: 21_000,
    } as Partial<LightningTransaction> & { amountMsats: number })
    const { wrapper, decodeInvoice, satsToFiat } = mountComponent(transaction)

    await flushPromises()

    expect(wrapper.text()).toContain('Received Lightning')
    expect(wrapper.text()).toMatch(/\+\s+21 sats/)
    expect(decodeInvoice).not.toHaveBeenCalled()
    expect(satsToFiat).toHaveBeenCalledWith(21)
  })
})
