import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import VerifyPayment from 'src/components/VerifyPayment.vue'
import type { Bolt11Invoice } from 'src/types/lightning'

const decodedInvoice: Bolt11Invoice = {
  invoice: 'lnbc1test',
  paymentHash: 'hash',
  amount: 42,
  timestamp: 0,
  expiry: 60,
  description: 'test payment',
}

describe('VerifyPayment', () => {
  function createWrapper(balanceErrorMessage?: string | null) {
    return mount(VerifyPayment, {
      props:
        balanceErrorMessage === undefined
          ? { decodedInvoice }
          : { decodedInvoice, balanceErrorMessage },
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
    const wrapper = createWrapper('Insufficient balance. Available: 10 sats')

    expect(wrapper.get('[data-testid="verify-payment-balance-error"]').text()).toBe(
      'Insufficient balance. Available: 10 sats',
    )
    expect(wrapper.find('[data-testid="verify-payment-slider"]').exists()).toBe(false)
    expect(
      wrapper.get('[data-testid="verify-payment-slider-disabled"]').attributes('disabled'),
    ).toBe('')
    expect(wrapper.emitted('pay')).toBeUndefined()
  })
})
