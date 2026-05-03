import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import DangerZoneSettings from 'src/components/settings/DangerZoneSettings.vue'

const mockRouterReplace = vi.hoisted(() => vi.fn())
const mockNotifyCreate = vi.hoisted(() => vi.fn())

const walletStoreMock = vi.hoisted(() => ({
  clearAllWallets: vi.fn(),
}))

const federationStoreMock = vi.hoisted(() => ({
  $reset: vi.fn(),
}))

const nostrStoreMock = vi.hoisted(() => ({
  $reset: vi.fn(),
}))

const onboardingStoreMock = vi.hoisted(() => ({
  $reset: vi.fn(),
}))

const pwaUpdateStoreMock = vi.hoisted(() => ({
  $reset: vi.fn(),
}))

const appLockStoreMock = vi.hoisted(() => ({
  clearAll: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    replace: mockRouterReplace,
  }),
}))

vi.mock('src/stores/wallet', () => ({
  useWalletStore: () => walletStoreMock,
}))

vi.mock('src/stores/federation', () => ({
  useFederationStore: () => federationStoreMock,
}))

vi.mock('src/stores/nostr', () => ({
  useNostrStore: () => nostrStoreMock,
}))

vi.mock('src/stores/onboarding', () => ({
  useOnboardingStore: () => onboardingStoreMock,
}))

vi.mock('src/stores/pwa-update', () => ({
  usePwaUpdateStore: () => pwaUpdateStoreMock,
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
  props: ['label', 'disable'],
  emits: ['click'],
  template:
    '<button v-bind="$attrs" :disabled="disable" @click="!disable && $emit(\'click\')">{{ label }}</button>',
}

const QCheckboxStub = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template:
    '<label v-bind="$attrs"><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', true)" /><slot /></label>',
}

const SlotStub = {
  template: '<div><slot /></div>',
}

describe('DangerZoneSettings', () => {
  function createWrapper() {
    return mount(DangerZoneSettings, {
      global: {
        stubs: {
          'q-card': SlotStub,
          'q-card-actions': SlotStub,
          'q-card-section': SlotStub,
          'q-checkbox': QCheckboxStub,
          'q-dialog': SlotStub,
          'q-btn': QBtnStub,
          'q-icon': SlotStub,
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockRouterReplace.mockResolvedValue(undefined)
  })

  it('clears only app-owned local storage keys when deleting data', async () => {
    localStorage.setItem('vipr.federations', '["kept-only-for-reset-test"]')
    localStorage.setItem('vipr.onboarding.state', '{"status":"in_progress"}')
    localStorage.setItem('external.key', 'preserve-me')

    const wrapper = createWrapper()
    await wrapper.find('[data-testid="settings-review-reset-btn"]').trigger('click')
    await wrapper.find('[data-testid="settings-reset-confirm-checkbox"] input').trigger('change')
    await wrapper.find('[data-testid="settings-delete-data-btn"]').trigger('click')
    await flushPromises()

    expect(walletStoreMock.clearAllWallets).toHaveBeenCalledTimes(1)
    expect(appLockStoreMock.clearAll).toHaveBeenCalledTimes(1)
    expect(federationStoreMock.$reset).toHaveBeenCalledTimes(1)
    expect(nostrStoreMock.$reset).toHaveBeenCalledTimes(1)
    expect(onboardingStoreMock.$reset).toHaveBeenCalledTimes(1)
    expect(pwaUpdateStoreMock.$reset).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('external.key')).toBe('preserve-me')
    expect(mockRouterReplace).toHaveBeenCalledWith({ name: '/startup-wizard' })
    expect(mockNotifyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Data deleted successfully',
      }),
    )
  })
})
