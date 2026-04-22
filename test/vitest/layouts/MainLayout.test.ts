import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { computed, reactive, nextTick, defineComponent } from 'vue'
import { Quasar, QFooter } from 'quasar'
import MainLayout from 'src/layouts/MainLayout.vue'

const mockUseRoute = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRoute: () => mockUseRoute(),
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
          QRouteTab: defineComponent({
            name: 'QRouteTab',
            props: {
              name: { type: String, required: false, default: '' },
              to: { type: [String, Object], required: false, default: '' },
              label: { type: String, required: false, default: '' },
              icon: { type: String, required: false, default: '' },
              exact: { type: Boolean, required: false, default: false },
            },
            setup(props) {
              const targetPath = computed(() => {
                if (typeof props.to === 'string') {
                  return props.to
                }

                return (
                  (props.to as { path?: string; name?: string } | null)?.path ??
                  (props.to as { path?: string; name?: string } | null)?.name ??
                  ''
                )
              })

              const isActive = computed(() => {
                if (targetPath.value.length === 0 || routeState.path.length === 0) {
                  return false
                }

                if (props.exact) {
                  return routeState.path === targetPath.value
                }

                return (
                  routeState.path === targetPath.value ||
                  routeState.path.startsWith(`${targetPath.value}/`) ||
                  routeState.path.startsWith(targetPath.value.replace(/\/$/, ''))
                )
              })

              return {
                isActive,
              }
            },
            template:
              '<div class="q-route-tab-stub" :data-name="name" :class="{ \'footer-route-active\': isActive }"><slot /></div>',
          }),
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
  })

  it('shows footer and maps home route to home tab', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.findComponent(QFooter).exists()).toBe(true)
    expect(wrapper.find('[data-name="home"]').classes()).toContain('footer-route-active')
  })

  it('maps federation route to federations tab', async () => {
    routeState.name = '/federations/'
    routeState.path = '/federations/'
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-name="federations"]').classes()).toContain('footer-route-active')
  })

  it('maps settings route to settings tab', async () => {
    routeState.name = '/settings/'
    routeState.path = '/settings/'
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-name="settings"]').classes()).toContain('footer-route-active')
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
    expect(wrapper.find('[data-name="home"]').classes()).toContain('footer-route-active')

    routeState.name = '/settings/'
    routeState.path = '/settings/'
    await nextTick()

    expect(wrapper.find('[data-name="settings"]').classes()).toContain('footer-route-active')
  })
})
