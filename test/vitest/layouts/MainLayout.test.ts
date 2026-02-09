import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { reactive, nextTick, defineComponent } from 'vue'
import { Quasar, QFooter, QTabs } from 'quasar'
import MainLayout from 'src/layouts/MainLayout.vue'

const mockUseRoute = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRoute: () => mockUseRoute(),
}))

describe('MainLayout.vue', () => {
  type RouteState = {
    name: string | null
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
          QRouteTab: defineComponent({
            name: 'QRouteTab',
            props: {
              name: { type: String, required: false, default: '' },
              to: { type: [String, Object], required: false, default: '' },
              label: { type: String, required: false, default: '' },
              icon: { type: String, required: false, default: '' },
            },
            template: '<div class="q-route-tab-stub" :data-name="name"><slot /></div>',
          }),
        },
      },
    })
  }

  beforeEach(() => {
    routeState = reactive<RouteState>({
      name: '/',
      meta: {},
    })
    mockUseRoute.mockReturnValue(routeState)
  })

  it('shows footer and maps home route to home tab', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.findComponent(QFooter).exists()).toBe(true)
    expect(wrapper.findComponent(QTabs).props('modelValue')).toBe('home')
  })

  it('maps federation route to federations tab', async () => {
    routeState.name = '/federations/'
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.findComponent(QTabs).props('modelValue')).toBe('federations')
  })

  it('maps settings route to settings tab', async () => {
    routeState.name = '/settings/'
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.findComponent(QTabs).props('modelValue')).toBe('settings')
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
    expect(wrapper.findComponent(QTabs).props('modelValue')).toBe('home')

    routeState.name = '/settings/'
    await nextTick()

    expect(wrapper.findComponent(QTabs).props('modelValue')).toBe('settings')
  })
})
