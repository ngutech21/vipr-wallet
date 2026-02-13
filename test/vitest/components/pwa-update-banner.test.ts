import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import PwaUpdateBanner from 'src/components/PwaUpdateBanner.vue'

const mockRoute = vi.hoisted(() => ({
  name: '/' as string | null,
}))

const mockApplyUpdate = vi.hoisted(() => vi.fn())
const mockCanApplyOnRoute = vi.hoisted(() => vi.fn())
const mockNotifyCreate = vi.hoisted(() => vi.fn())

const mockPwaUpdateStore = vi.hoisted(() => ({
  isUpdateReady: false,
  state: 'idle',
  lastError: null as string | null,
  canApplyOnRoute: mockCanApplyOnRoute,
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

const QBannerStub = {
  template: '<div v-bind="$attrs"><slot /></div>',
}

describe('PwaUpdateBanner', () => {
  function createWrapper() {
    return mount(PwaUpdateBanner, {
      global: {
        stubs: {
          'q-banner': QBannerStub,
          'q-btn': QBtnStub,
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockRoute.name = '/'
    mockPwaUpdateStore.isUpdateReady = false
    mockPwaUpdateStore.state = 'idle'
    mockCanApplyOnRoute.mockReturnValue(true)
    mockApplyUpdate.mockResolvedValue('applied')
  })

  it('shows only when update is ready and route is safe', () => {
    const hiddenWrapper = createWrapper()
    expect(hiddenWrapper.find('[data-testid="pwa-update-banner"]').exists()).toBe(false)

    mockPwaUpdateStore.isUpdateReady = true
    mockCanApplyOnRoute.mockReturnValue(true)
    const visibleWrapper = createWrapper()
    expect(visibleWrapper.find('[data-testid="pwa-update-banner"]').exists()).toBe(true)
  })

  it('hides on unsafe routes even when update is ready', () => {
    mockPwaUpdateStore.isUpdateReady = true
    mockCanApplyOnRoute.mockReturnValue(false)

    const wrapper = createWrapper()

    expect(wrapper.find('[data-testid="pwa-update-banner"]').exists()).toBe(false)
  })

  it('triggers applyUpdate once with the current route name', async () => {
    mockRoute.name = '/settings/'
    mockPwaUpdateStore.isUpdateReady = true
    mockCanApplyOnRoute.mockReturnValue(true)
    const wrapper = createWrapper()

    await wrapper.find('[data-testid="pwa-update-apply-btn"]').trigger('click')
    await flushPromises()

    expect(mockApplyUpdate).toHaveBeenCalledTimes(1)
    expect(mockApplyUpdate).toHaveBeenCalledWith('/settings/')
  })

  it('disables button while applying', () => {
    mockPwaUpdateStore.isUpdateReady = true
    mockPwaUpdateStore.state = 'applying'
    mockCanApplyOnRoute.mockReturnValue(true)

    const wrapper = createWrapper()
    const button = wrapper.find('[data-testid="pwa-update-apply-btn"]')

    expect(button.attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-testid="pwa-update-banner-status"]').text()).toContain(
      'Applying update...',
    )
  })

  it('shows actionable notification when apply fails', async () => {
    mockPwaUpdateStore.isUpdateReady = true
    mockCanApplyOnRoute.mockReturnValue(true)
    mockApplyUpdate.mockResolvedValue('error')
    const wrapper = createWrapper()

    await wrapper.find('[data-testid="pwa-update-apply-btn"]').trigger('click')
    await flushPromises()

    expect(mockNotifyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Update failed. Tap "Update now" again.',
      }),
    )
  })
})
