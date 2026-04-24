import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { reactive, nextTick } from 'vue'
import { Quasar, QFooter } from 'quasar'
import MainLayout from 'src/layouts/MainLayout.vue'

const mockUseRoute = vi.hoisted(() => vi.fn())
const mockRouterPush = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRoute: () => mockUseRoute(),
  useRouter: () => ({
    push: mockRouterPush,
  }),
}))

describe('MainLayout.vue', () => {
  type RouteState = {
    name: string | null
    path: string
    meta: {
      hideBottomNav?: boolean
    }
  }

  let routeState: RouteState

  function createWrapper(): VueWrapper {
    return mount(MainLayout, {
      slots: {
        default: '<div data-testid="page-content">Page</div>',
      },
      global: {
        plugins: [Quasar],
        stubs: {
          AddFederation: true,
          PwaUpdateBanner: true,
          QTabs: {
            props: {
              modelValue: { type: String, required: false, default: null },
            },
            template:
              '<div data-testid="footer-tabs" :data-model-value="modelValue"><slot /></div>',
          },
          QTab: {
            props: {
              name: { type: String, required: false, default: '' },
            },
            emits: ['click'],
            template:
              '<button type="button" class="q-tab-stub" :data-name="name" @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    })
  }

  beforeEach(() => {
    routeState = reactive<RouteState>({
      name: '/',
      path: '/',
      meta: {},
    })
    mockUseRoute.mockReturnValue(routeState)
    mockRouterPush.mockReset()
  })

  it('shows footer and maps home route to home tab', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.findComponent(QFooter).exists()).toBe(true)
    expect(wrapper.find('[data-testid="footer-tabs"]').attributes('data-model-value')).toBe('home')
  })

  it('maps federation route to federations tab', async () => {
    routeState.name = '/federations/'
    routeState.path = '/federations/'
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-testid="footer-tabs"]').attributes('data-model-value')).toBe(
      'federations',
    )
  })

  it('maps settings route to settings tab', async () => {
    routeState.name = '/settings/'
    routeState.path = '/settings/'
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-testid="footer-tabs"]').attributes('data-model-value')).toBe(
      'settings',
    )
  })

  it('hides footer when route meta requests hidden nav', async () => {
    routeState.meta.hideBottomNav = true
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.findComponent(QFooter).exists()).toBe(false)
  })

  it('reacts to route changes after mount', async () => {
    const wrapper = createWrapper()
    await flushPromises()
    expect(wrapper.find('[data-testid="footer-tabs"]').attributes('data-model-value')).toBe('home')

    routeState.name = '/settings/'
    routeState.path = '/settings/'
    await nextTick()

    expect(wrapper.find('[data-testid="footer-tabs"]').attributes('data-model-value')).toBe(
      'settings',
    )
  })

  it('navigates with named routes when clicking a footer tab', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.find('[data-name="federations"]').trigger('click')

    expect(mockRouterPush).toHaveBeenCalledWith({ name: '/federations/' })
  })
})
