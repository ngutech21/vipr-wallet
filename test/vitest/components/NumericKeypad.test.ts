import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import NumericKeypad from 'src/components/NumericKeypad.vue'
import type { KeypadButton } from 'src/composables/useNumericInput'

describe('NumericKeypad.vue', () => {
  it('renders provided keypad buttons and delegates clicks', async () => {
    const firstHandler = vi.fn()
    const secondHandler = vi.fn()
    const buttons: KeypadButton[] = [
      { testId: 'keypad-btn-1', label: '1', handler: firstHandler },
      { testId: 'keypad-btn-backspace', icon: 'backspace', handler: secondHandler },
    ]

    const wrapper = mount(NumericKeypad, {
      props: {
        buttons,
      },
      global: {
        stubs: {
          'q-btn': {
            props: {
              disable: { type: Boolean, required: false, default: false },
              loading: { type: Boolean, required: false, default: false },
            },
            emits: ['click'],
            template:
              '<button v-bind="$attrs" :disabled="disable || loading" @click="!disable && !loading && $emit(\'click\')"><slot /></button>',
          },
        },
      },
    })

    expect(wrapper.find('[data-testid="numeric-keypad"]').exists()).toBe(true)

    await wrapper.get('[data-testid="keypad-btn-1"]').trigger('click')
    await wrapper.get('[data-testid="keypad-btn-backspace"]').trigger('click')

    expect(firstHandler).toHaveBeenCalledTimes(1)
    expect(secondHandler).toHaveBeenCalledTimes(1)
  })
})
