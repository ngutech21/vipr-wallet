import { mount, flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import AppLockPinEntry from 'src/components/AppLockPinEntry.vue'

const QBtnStub = {
  props: ['label', 'disable', 'loading'],
  emits: ['click'],
  template:
    '<button v-bind="$attrs" :disabled="disable || loading" @click="$emit(\'click\')">{{ label }}</button>',
}

const QIconStub = {
  template: '<span v-bind="$attrs"></span>',
}

describe('AppLockPinEntry', () => {
  function createWrapper(onSubmit = vi.fn(() => true)) {
    return mount(AppLockPinEntry, {
      props: {
        mode: 'setup',
        onSubmit,
      },
      global: {
        stubs: {
          'q-btn': QBtnStub,
          'q-icon': QIconStub,
        },
      },
    })
  }

  async function enterPin(wrapper: ReturnType<typeof createWrapper>, digits: string) {
    await digits.split('').reduce(async (previousDigit, digit) => {
      await previousDigit
      await wrapper.get(`[data-testid="app-lock-keypad-btn-${digit}"]`).trigger('click')
    }, Promise.resolve())
  }

  it('does not submit setup until the PIN is confirmed', async () => {
    const onSubmit = vi.fn(() => true)
    const wrapper = createWrapper(onSubmit)

    await enterPin(wrapper, '1234')
    await wrapper.get('[data-testid="app-lock-pin-submit"]').trigger('click')

    expect(onSubmit).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Confirm PIN')

    await enterPin(wrapper, '1234')
    await wrapper.get('[data-testid="app-lock-pin-submit"]').trigger('click')
    await flushPromises()

    expect(onSubmit).toHaveBeenCalledWith('1234')
    expect(wrapper.emitted('success')).toHaveLength(1)
  })

  it('rejects mismatched setup confirmation and starts over', async () => {
    const onSubmit = vi.fn(() => true)
    const wrapper = createWrapper(onSubmit)

    await enterPin(wrapper, '1234')
    await wrapper.get('[data-testid="app-lock-pin-submit"]').trigger('click')
    await enterPin(wrapper, '1111')
    await wrapper.get('[data-testid="app-lock-pin-submit"]').trigger('click')

    expect(onSubmit).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="app-lock-pin-error"]').text()).toContain('PINs do not match')
    expect(wrapper.text()).toContain('Set PIN')
  })

  it('shows an error when verify mode rejects a PIN', async () => {
    const onSubmit = vi.fn(() => false)
    const wrapper = mount(AppLockPinEntry, {
      props: {
        mode: 'verify',
        onSubmit,
      },
      global: {
        stubs: {
          'q-btn': QBtnStub,
          'q-icon': QIconStub,
        },
      },
    })

    await enterPin(wrapper, '1234')
    await wrapper.get('[data-testid="app-lock-pin-submit"]').trigger('click')
    await flushPromises()

    expect(onSubmit).toHaveBeenCalledWith('1234')
    expect(wrapper.get('[data-testid="app-lock-pin-error"]').text()).toContain('Incorrect PIN')
  })
})
