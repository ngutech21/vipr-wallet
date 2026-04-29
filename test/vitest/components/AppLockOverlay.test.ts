import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import AppLockOverlay from 'src/components/AppLockOverlay.vue'
import { useAppLockStore } from 'src/stores/app-lock'

const QBtnStub = {
  props: ['label', 'disable', 'loading'],
  emits: ['click'],
  template:
    '<button v-bind="$attrs" :disabled="disable || loading" @click="$emit(\'click\')">{{ label }}</button>',
}

const QIconStub = {
  template: '<span v-bind="$attrs" />',
}

const AppLockPinEntryStub = {
  template: '<div v-bind="$attrs">PIN Entry</div>',
}

describe('AppLockOverlay', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function mountLockedOverlay(options: { biometricEnabled: boolean }) {
    const store = useAppLockStore()
    store.pinHash = 'pin-hash'
    store.pinSalt = 'pin-salt'
    store.locked = true
    store.biometricCredentialId = options.biometricEnabled ? 'credential-id' : null

    const wrapper = mount(AppLockOverlay, {
      global: {
        stubs: {
          AppLockPinEntry: AppLockPinEntryStub,
          'q-btn': QBtnStub,
          'q-icon': QIconStub,
        },
      },
    })

    return { store, wrapper }
  }

  it('starts with only biometric unlock when biometrics are enabled', async () => {
    const { wrapper } = mountLockedOverlay({ biometricEnabled: true })

    expect(wrapper.find('[data-testid="app-lock-biometric-unlock-btn"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="app-lock-show-pin-btn"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="app-lock-pin-unlock"]').exists()).toBe(false)

    await wrapper.get('[data-testid="app-lock-show-pin-btn"]').trigger('click')

    expect(wrapper.find('[data-testid="app-lock-biometric-unlock-btn"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="app-lock-pin-unlock"]').exists()).toBe(true)
  })

  it('shows PIN unlock immediately when biometrics are not enabled', () => {
    const { wrapper } = mountLockedOverlay({ biometricEnabled: false })

    expect(wrapper.find('[data-testid="app-lock-biometric-unlock-btn"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="app-lock-show-pin-btn"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="app-lock-pin-unlock"]').exists()).toBe(true)
  })

  it('resets back to biometric-first on a later lock', async () => {
    const { store, wrapper } = mountLockedOverlay({ biometricEnabled: true })

    await wrapper.get('[data-testid="app-lock-show-pin-btn"]').trigger('click')
    expect(wrapper.find('[data-testid="app-lock-pin-unlock"]').exists()).toBe(true)

    store.locked = false
    await nextTick()
    store.locked = true
    await nextTick()

    expect(wrapper.find('[data-testid="app-lock-biometric-unlock-btn"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="app-lock-pin-unlock"]').exists()).toBe(false)
  })
})
