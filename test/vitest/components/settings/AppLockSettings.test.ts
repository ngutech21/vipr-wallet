import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import AppLockSettings from 'src/components/settings/AppLockSettings.vue'

const mockNotifyCreate = vi.hoisted(() => vi.fn())
const mockAppLockIsBiometricAvailable = vi.hoisted(() => vi.fn())

const appLockStoreMock = vi.hoisted(() => ({
  isPinConfigured: false,
  isBiometricEnabled: false,
  isBiometricAvailable: mockAppLockIsBiometricAvailable,
  setPin: vi.fn(),
  verifyPin: vi.fn(),
  removePin: vi.fn(),
  enableBiometric: vi.fn(),
  disableBiometric: vi.fn(),
}))

vi.mock('src/stores/app-lock', () => ({
  useAppLockStore: () => appLockStoreMock,
}))

vi.mock('quasar', async (importOriginal) => {
  const actual = await importOriginal()
  return Object.assign({}, actual, {
    Notify: {
      create: mockNotifyCreate,
    },
  })
})

const QBtnStub = {
  props: ['label', 'disable', 'loading'],
  template: '<button v-bind="$attrs" :disabled="disable || loading">{{ label }}</button>',
}

const QDialogStub = {
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },
  template: '<div><slot /></div>',
}

const SlotStub = {
  template: '<div><slot /></div>',
}

const AppLockPinEntryStub = {
  props: ['onSubmit'],
  emits: ['success'],
  template:
    '<button data-testid="settings-app-lock-pin-dialog-stub" @click="$emit(\'success\')">PIN</button>',
}

describe('AppLockSettings', () => {
  function createWrapper() {
    return mount(AppLockSettings, {
      global: {
        stubs: {
          SettingsSection: SlotStub,
          QDialog: QDialogStub,
          'q-dialog': QDialogStub,
          'q-card': SlotStub,
          'q-card-section': SlotStub,
          'q-btn': QBtnStub,
          AppLockPinEntry: AppLockPinEntryStub,
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    appLockStoreMock.isPinConfigured = false
    appLockStoreMock.isBiometricEnabled = false
    mockAppLockIsBiometricAvailable.mockResolvedValue(false)
  })

  it('shows setup state when no PIN is configured', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('PIN is not set')
    expect(wrapper.find('[data-testid="settings-app-lock-set-pin-btn"]').exists()).toBe(true)
    expect(
      wrapper.find('[data-testid="settings-app-lock-biometric-btn"]').attributes('disabled'),
    ).toBe('')
    expect(wrapper.text()).toContain('Face ID / Touch ID is not available in this browser.')
  })

  it('disables biometrics when already enabled', async () => {
    appLockStoreMock.isPinConfigured = true
    appLockStoreMock.isBiometricEnabled = true
    mockAppLockIsBiometricAvailable.mockResolvedValue(true)

    const wrapper = createWrapper()
    await flushPromises()
    await wrapper.find('[data-testid="settings-app-lock-biometric-btn"]').trigger('click')
    await flushPromises()

    expect(appLockStoreMock.disableBiometric).toHaveBeenCalledTimes(1)
    expect(mockNotifyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Face ID / Touch ID disabled',
      }),
    )
  })
})
