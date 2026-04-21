import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { Quasar } from 'quasar'
import ReceiveEcashSelection from 'src/components/ReceiveEcashSelection.vue'

const mockRouterPush = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}))

describe('ReceiveEcashSelection.vue', () => {
  let wrapper: VueWrapper | undefined

  function createWrapper() {
    return mount(ReceiveEcashSelection, {
      global: {
        plugins: [Quasar],
        stubs: {
          ModalCard: defineComponent({
            name: 'ModalCard',
            props: {
              title: { type: String, required: false, default: '' },
            },
            emits: ['close'],
            template: `
              <div class="modal-card">
                <button data-testid="modal-card-close-btn" @click="$emit('close')">close</button>
                <slot />
              </div>
            `,
          }),
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

  it('renders the available receive actions', () => {
    wrapper = createWrapper()

    expect(wrapper.text()).toContain('Receive via Onchain')
    expect(wrapper.text()).toContain('Receive via Lightning')
    expect(wrapper.text()).toContain('Receive Offline eCash')
  })

  it('renders helper copy for the action chooser', () => {
    wrapper = createWrapper()

    expect(wrapper.text()).toContain(
      'Choose how you want to receive funds into your current federation.',
    )
  })

  it('forwards the modal close event', async () => {
    wrapper = createWrapper()

    await wrapper.get('[data-testid="modal-card-close-btn"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it.each([
    ['receive-onchain-card', { name: '/receive-onchain' }],
    ['receive-lightning-card', { name: '/receive' }],
    ['receive-offline-card', { name: '/receive-ecash' }],
  ])('closes and navigates when %s is selected', async (testId, routeTarget) => {
    wrapper = createWrapper()

    await wrapper.get(`[data-testid="${testId}"]`).trigger('click')
    await flushPromises()

    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(mockRouterPush).toHaveBeenCalledWith(routeTarget)
  })

  it('renders stable action targets for automated tests', () => {
    wrapper = createWrapper()

    expect(wrapper.find('[data-testid="receive-onchain-card"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="receive-lightning-card"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="receive-offline-card"]').exists()).toBe(true)
  })
})
