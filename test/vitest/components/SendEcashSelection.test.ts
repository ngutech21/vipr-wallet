import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { Quasar } from 'quasar'
import SendEcashSelection from 'src/components/SendEcashSelection.vue'

const mockRouterPush = vi.hoisted(() => vi.fn())

vi.mock('quasar', async (importOriginal) => {
  const actual = await importOriginal()
  return Object.assign({}, actual, {
    Ripple: {
      beforeMount: () => undefined,
      mounted: () => undefined,
      updated: () => undefined,
      unmounted: () => undefined,
    },
  })
})

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}))

describe('SendEcashSelection.vue', () => {
  let wrapper: VueWrapper | undefined

  function createWrapper() {
    return mount(SendEcashSelection, {
      global: {
        plugins: [Quasar],
        directives: {
          ripple: {},
        },
        stubs: {
          ModalCard: {
            template: '<div class="modal-card"><slot /></div>',
            props: ['title'],
          },
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockRouterPush.mockResolvedValue(true)
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  it('renders both send options', () => {
    wrapper = createWrapper()

    expect(wrapper.text()).toContain('Send via Lightning')
    expect(wrapper.text()).toContain('Send On-chain')
    expect(wrapper.text()).toContain('Send offline ecash')
  })

  it('navigates to the online send page and closes', async () => {
    wrapper = createWrapper()

    await wrapper.get('[data-testid="send-lightning-card"]').trigger('click')
    await flushPromises()

    expect(mockRouterPush).toHaveBeenCalledWith({ name: '/send' })
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('navigates to the offline send page and closes', async () => {
    wrapper = createWrapper()

    await wrapper.get('[data-testid="send-offline-card"]').trigger('click')
    await flushPromises()

    expect(mockRouterPush).toHaveBeenCalledWith({ name: '/send-ecash' })
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('navigates to the onchain send page and closes', async () => {
    wrapper = createWrapper()

    await wrapper.get('[data-testid="send-onchain-card"]').trigger('click')
    await flushPromises()

    expect(mockRouterPush).toHaveBeenCalledWith({ path: '/send-onchain' })
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
