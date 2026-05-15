import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { defineComponent } from 'vue'
import type { EcashTransaction } from '@fedimint/core'
import EcashTransactionItem from 'src/components/EcashTransactionItem.vue'
import { useLightningStore } from 'src/stores/lightning'
import { PassthroughStub } from '../mocks/quasar-stubs'

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

function createTransaction(overrides: Partial<EcashTransaction> = {}): EcashTransaction {
  return {
    kind: 'mint',
    operationId: 'ecash-op-1',
    type: 'reissue',
    amountMsats: 21_000,
    timestamp: 1_234_567_890_000,
    ...overrides,
  }
}

function mountComponent(transaction: EcashTransaction) {
  const pinia = createTestingPinia({
    stubActions: false,
    createSpy: vi.fn,
  })
  const lightningStore = useLightningStore()
  const satsToFiat = vi.spyOn(lightningStore, 'satsToFiat').mockResolvedValue(2.1)

  const wrapper = mount(EcashTransactionItem, {
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

  return { wrapper, satsToFiat }
}

describe('EcashTransactionItem.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders received ecash with positive amount and converts msats to sats for fiat', async () => {
    const { wrapper, satsToFiat } = mountComponent(createTransaction({ amountMsats: 21_000 }))
    await flushPromises()

    expect(wrapper.text()).toContain('Received Ecash')
    expect(wrapper.text()).toMatch(/\+\s+21 sats/)
    expect(wrapper.text()).toContain('≈ $2.10 usd')
    expect(satsToFiat).toHaveBeenCalledWith(21)
  })

  it('renders sent ecash with a negative amount', async () => {
    const { wrapper } = mountComponent(
      createTransaction({
        type: 'spend_oob',
        amountMsats: 42_000,
      }),
    )
    await flushPromises()

    expect(wrapper.text()).toContain('Sent Ecash')
    expect(wrapper.text()).toMatch(/-\s+42 sats/)
    expect(wrapper.html()).toContain('text-negative')
  })

  it('emits the operation id when selected', async () => {
    const { wrapper } = mountComponent(createTransaction({ operationId: 'ecash-op-click' }))

    await wrapper.get('[data-testid="ecash-transaction-item-ecash-op-click"]').trigger('click')

    expect(wrapper.emitted('click')).toEqual([['ecash-op-click']])
  })

  it('refreshes fiat when the transaction amount changes', async () => {
    const transaction = createTransaction({ amountMsats: 21_000 })
    const { wrapper, satsToFiat } = mountComponent(transaction)
    satsToFiat.mockResolvedValueOnce(4.2)
    await flushPromises()

    await wrapper.setProps({
      transaction: createTransaction({ operationId: 'ecash-op-2', amountMsats: 42_000 }),
    })
    await flushPromises()

    expect(satsToFiat).toHaveBeenLastCalledWith(42)
    expect(wrapper.text()).toContain('≈ $4.20 usd')
  })

  it('falls back cleanly when fiat conversion fails', async () => {
    const transaction = createTransaction({ amountMsats: 21_000 })
    const { wrapper, satsToFiat } = mountComponent(transaction)
    satsToFiat.mockRejectedValueOnce(new Error('fiat unavailable'))

    await wrapper.setProps({
      transaction: createTransaction({ operationId: 'ecash-op-2', amountMsats: 22_000 }),
    })
    await flushPromises()

    expect(wrapper.text()).toContain('≈ $0.00 usd')
  })
})
