import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import VerifyPayment from 'src/components/VerifyPayment.vue'
import type { Bolt11Invoice } from 'src/types/lightning'

const updateGatewayCache = vi.hoisted(() => vi.fn())
const listGateways = vi.hoisted(() => vi.fn())
const walletStoreMock = vi.hoisted(() => ({
  wallet: {
    lightning: {
      updateGatewayCache,
      listGateways,
    },
  },
}))

vi.mock('src/stores/wallet', () => ({
  useWalletStore: () => walletStoreMock,
}))

const decodedInvoice: Bolt11Invoice = {
  invoice: 'lnbc1test',
  paymentHash: 'hash',
  amount: 42,
  timestamp: 0,
  expiry: 60,
  description: 'test payment',
}

describe('VerifyPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    walletStoreMock.wallet = {
      lightning: {
        updateGatewayCache,
        listGateways,
      },
    }
    updateGatewayCache.mockResolvedValue(undefined)
    listGateways.mockResolvedValue([])
  })

  function createWrapper({
    balanceErrorMessage,
    invoice = decodedInvoice,
  }: {
    balanceErrorMessage?: string | null
    invoice?: Bolt11Invoice
  } = {}) {
    return mount(VerifyPayment, {
      props:
        balanceErrorMessage === undefined
          ? { decodedInvoice: invoice }
          : { decodedInvoice: invoice, balanceErrorMessage },
      global: {
        stubs: {
          'q-icon': {
            template: '<span><slot /></span>',
          },
          'q-slide-item': {
            emits: ['left', 'action'],
            template:
              '<button data-testid="verify-payment-slider" @click="$emit(\'left\')"><slot /></button>',
          },
        },
      },
    })
  }

  it('renders an interactive slide item and emits pay when payment is allowed', async () => {
    const wrapper = createWrapper()

    await wrapper.get('[data-testid="verify-payment-slider"]').trigger('click')

    expect(wrapper.emitted('pay')).toHaveLength(1)
    expect(wrapper.find('[data-testid="verify-payment-slider-disabled"]').exists()).toBe(false)
  })

  it('renders a disabled payment control instead of an interactive slide item when balance fails', () => {
    const wrapper = createWrapper({
      balanceErrorMessage: 'Insufficient balance. Available: 10 sats',
    })

    expect(wrapper.get('[data-testid="verify-payment-balance-error"]').text()).toBe(
      'Insufficient balance. Available: 10 sats',
    )
    expect(wrapper.find('[data-testid="verify-payment-slider"]').exists()).toBe(false)
    expect(
      wrapper.get('[data-testid="verify-payment-slider-disabled"]').attributes('disabled'),
    ).toBe('')
    expect(wrapper.emitted('pay')).toBeUndefined()
  })

  it('shows only user-facing invoice details and hides empty descriptions', () => {
    const wrapper = createWrapper({
      invoice: {
        ...decodedInvoice,
        description: '   ',
      },
    })

    expect(wrapper.text()).toContain('Amount')
    expect(wrapper.text()).toContain('42 sats')
    expect(wrapper.text()).not.toContain('Description')
    expect(wrapper.text()).not.toContain('Payment hash')
    expect(wrapper.text()).not.toContain('Expires')
  })

  it('shows the invoice description when it contains text', () => {
    const wrapper = createWrapper()

    expect(wrapper.text()).toContain('Description')
    expect(wrapper.text()).toContain('test payment')
  })

  it('shows the estimated gateway fee from the first gateway', async () => {
    listGateways.mockResolvedValue([
      {
        info: {
          fees: {
            base: { msats: 20 },
            parts_per_million: 20_000,
          },
        },
      },
    ])

    const wrapper = createWrapper()
    await flushPromises()

    expect(updateGatewayCache).toHaveBeenCalledTimes(1)
    expect(listGateways).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Gateway fee')
    expect(wrapper.text()).toContain('~0.86 sats')
  })

  it('hides gateway fee when gateway fees cannot be parsed', async () => {
    listGateways.mockResolvedValue([
      {
        info: {
          fees: {},
        },
      },
    ])

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Gateway fee')
  })
})
