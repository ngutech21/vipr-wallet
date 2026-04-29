import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import PwaUpdateSettings from 'src/components/settings/PwaUpdateSettings.vue'

type MockRoute = {
  name: string | null
}

const mockRoute: MockRoute = vi.hoisted(() => ({
  name: '/settings/',
}))
const mockCheckForUpdatesManual = vi.hoisted(() => vi.fn())
const mockApplyUpdate = vi.hoisted(() => vi.fn())
const mockCanApplyOnRoute = vi.hoisted(() => vi.fn())
const mockNotifyCreate = vi.hoisted(() => vi.fn())

const mockPwaUpdateStore = vi.hoisted(() => ({
  state: 'idle',
  registration: null,
  lastError: null as string | null,
  isUpdateReady: false,
  $reset: vi.fn(),
  canApplyOnRoute: mockCanApplyOnRoute,
  checkForUpdatesManual: mockCheckForUpdatesManual,
  checkForUpdatesStartup: vi.fn(),
  applyUpdate: mockApplyUpdate,
}))

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
}))

vi.mock('src/stores/pwa-update', () => ({
  usePwaUpdateStore: () => mockPwaUpdateStore,
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
  emits: ['click'],
  template:
    '<button v-bind="$attrs" :disabled="disable || loading" @click="$emit(\'click\')">{{ label }}</button>',
}

const SlotStub = {
  template: '<div><slot /></div>',
}

describe('PwaUpdateSettings', () => {
  function createWrapper() {
    return mount(PwaUpdateSettings, {
      global: {
        stubs: {
          BuildInfo: true,
          SettingsSection: SlotStub,
          'q-btn': QBtnStub,
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockRoute.name = '/settings/'
    mockPwaUpdateStore.state = 'idle'
    mockPwaUpdateStore.lastError = null
    mockPwaUpdateStore.isUpdateReady = false
    mockCanApplyOnRoute.mockReturnValue(true)
    mockCheckForUpdatesManual.mockResolvedValue('up-to-date')
    mockApplyUpdate.mockResolvedValue('applied')
  })

  it('shows check button and triggers manual update check', async () => {
    const wrapper = createWrapper()
    const button = wrapper.find('[data-testid="settings-check-updates-btn"]')

    expect(wrapper.html()).toContain('build-info-stub')
    expect(button.text()).toBe('Check for updates')
    await button.trigger('click')
    await flushPromises()

    expect(mockCheckForUpdatesManual).toHaveBeenCalledTimes(1)
    expect(mockApplyUpdate).not.toHaveBeenCalled()
  })

  it('shows apply button and triggers apply update when update is ready', async () => {
    mockPwaUpdateStore.isUpdateReady = true
    mockPwaUpdateStore.state = 'waiting'
    const wrapper = createWrapper()
    const button = wrapper.find('[data-testid="settings-check-updates-btn"]')

    expect(button.text()).toBe('Update ready')
    await button.trigger('click')
    await flushPromises()

    expect(mockApplyUpdate).toHaveBeenCalledWith('/settings/')
    expect(mockCheckForUpdatesManual).not.toHaveBeenCalled()
  })

  it('shows disallowed route hint and notification when apply is blocked', async () => {
    mockRoute.name = '/send'
    mockPwaUpdateStore.isUpdateReady = true
    mockPwaUpdateStore.state = 'waiting'
    mockCanApplyOnRoute.mockReturnValue(false)
    mockApplyUpdate.mockResolvedValue('blocked-route')

    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('Update is ready. Open Home or Settings to apply safely.')

    await wrapper.find('[data-testid="settings-check-updates-btn"]').trigger('click')
    await flushPromises()

    expect(mockApplyUpdate).toHaveBeenCalledWith('/send')
    expect(mockNotifyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Update is ready. Open Home or Settings to apply safely.',
      }),
    )
  })

  it('shows checking notification when apply triggers background download', async () => {
    mockPwaUpdateStore.isUpdateReady = true
    mockPwaUpdateStore.state = 'waiting'
    mockApplyUpdate.mockResolvedValue('checking')

    const wrapper = createWrapper()
    await wrapper.find('[data-testid="settings-check-updates-btn"]').trigger('click')
    await flushPromises()

    expect(mockNotifyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Update is downloading in the background',
      }),
    )
  })
})
