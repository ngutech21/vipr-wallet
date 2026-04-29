import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AmountEntryGroup from 'src/components/AmountEntryGroup.vue'
import type { KeypadButton } from 'src/composables/useNumericInput'

const QBtnStub = {
  props: {
    label: { type: String, required: false, default: '' },
    icon: { type: String, required: false, default: '' },
  },
  emits: ['click'],
  template: '<button v-bind="$attrs" @click="$emit(\'click\')">{{ label }}{{ icon }}</button>',
}

const buttons: KeypadButton[] = [
  {
    label: '1',
    testId: 'keypad-1',
    handler: () => undefined,
  },
]

describe('AmountEntryGroup', () => {
  it('keeps amount, meta, keypad, and optional fields in one stable group', () => {
    const wrapper = mount(AmountEntryGroup, {
      props: {
        value: '42',
        buttons,
        label: 'Amount in sats',
        metaText: 'Limit: 1 - 100 sats',
        amountTestId: 'amount-input',
        metaTestId: 'amount-meta',
      },
      slots: {
        default: '<input data-testid="memo-input" />',
      },
      global: {
        stubs: {
          'q-btn': QBtnStub,
        },
      },
    })

    expect(wrapper.get('[data-testid="amount-input"]').text()).toContain('42')
    expect(wrapper.get('[data-testid="amount-meta"]').text()).toBe('Limit: 1 - 100 sats')
    expect(wrapper.find('[data-testid="keypad-1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="memo-input"]').exists()).toBe(true)
  })

  it('uses the reserved meta row for errors without rendering duplicate amount error text', () => {
    const wrapper = mount(AmountEntryGroup, {
      props: {
        value: '101',
        buttons,
        errorMessage: 'Amount must be 100 sats or less',
        metaText: 'Limit: 1 - 100 sats',
        metaTestId: 'amount-meta',
      },
      global: {
        stubs: {
          'q-btn': QBtnStub,
        },
      },
    })

    expect(wrapper.get('.amount-display').classes()).toContain('amount-display--error')
    expect(wrapper.find('.amount-display__error').exists()).toBe(false)
    expect(wrapper.get('[data-testid="amount-meta"]').text()).toBe(
      'Amount must be 100 sats or less',
    )
  })
})
