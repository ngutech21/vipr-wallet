import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import SendEcashPage from 'src/pages/send-ecash.vue'

const mockRouterPush = vi.hoisted(() => vi.fn())
const mockSpendEcashOffline = vi.hoisted(() => vi.fn())
const mockShare = vi.hoisted(() => vi.fn())
const mockNotify = vi.hoisted(() => vi.fn())
const mockLoadingShow = vi.hoisted(() => vi.fn())
const mockLoadingHide = vi.hoisted(() => vi.fn())

const federationStoreState = vi.hoisted(() => ({
  selectedFederation: {
    title: 'Test Federation',
    federationId: 'fed-1',
    inviteCode: 'fed11test',
    modules: [],
    metadata: {
      max_invoice_msats: '50000',
    },
  },
}))

const walletStoreState = vi.hoisted(() => ({
  balance: 100,
  spendEcashOffline: mockSpendEcashOffline,
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}))

vi.mock('src/stores/federation', () => ({
  useFederationStore: () => federationStoreState,
}))

vi.mock('src/stores/wallet', () => ({
  useWalletStore: () => walletStoreState,
}))

vi.mock('@vueuse/core', () => ({
  useShare: () => ({
    share: mockShare,
    isSupported: true,
  }),
}))

vi.mock('quasar', async (importOriginal) => {
  const actual = await importOriginal()
  return Object.assign({}, actual, {
    Loading: {
      show: mockLoadingShow,
      hide: mockLoadingHide,
    },
    useQuasar: () => ({
      notify: mockNotify,
    }),
  })
})

describe('SendEcashPage.vue', () => {
  let wrapper: VueWrapper | undefined
  const clipboardWriteText = vi.fn()

  function createWrapper() {
    return mount(SendEcashPage, {
      global: {
        stubs: {
          transition: false,
          'q-page': { template: '<div><slot /></div>' },
          'q-toolbar': { template: '<div><slot /></div>' },
          'q-toolbar-title': { template: '<div><slot /></div>' },
          'q-card': { template: '<div><slot /></div>' },
          'q-card-section': { template: '<div><slot /></div>' },
          'q-card-actions': { template: '<div><slot /></div>' },
          'q-separator': { template: '<hr />' },
          'q-space': { template: '<span />' },
          'q-spinner-dots': { template: '<span />' },
          AnimatedEcashQr: {
            props: {
              notes: { type: String, required: true },
            },
            template: '<div data-testid="send-ecash-animated-qr-stub" :data-notes="notes" />',
          },
          'q-btn': {
            props: {
              disable: { type: Boolean, required: false, default: false },
            },
            emits: ['click'],
            template:
              '<button v-bind="$attrs" :disabled="disable" @click="$emit(\'click\')"><slot /></button>',
          },
          'q-input': {
            props: {
              modelValue: { type: [String, Number, null], required: false, default: '' },
              type: { type: String, required: false, default: 'text' },
              readonly: { type: Boolean, required: false, default: false },
            },
            emits: ['update:modelValue'],
            template: `
              <label v-bind="$attrs">
                <textarea
                  v-if="type === 'textarea'"
                  :value="modelValue"
                  :readonly="readonly"
                  @input="$emit('update:modelValue', $event.target.value)"
                />
                <input
                  v-else
                  :type="type"
                  :value="modelValue"
                  :readonly="readonly"
                  @input="$emit('update:modelValue', $event.target.value)"
                />
              </label>
            `,
          },
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockRouterPush.mockResolvedValue(true)
    mockSpendEcashOffline.mockResolvedValue({
      notes: 'cashuAoffline123',
      operationId: 'op-1',
    })
    mockShare.mockResolvedValue(undefined)
    walletStoreState.balance = 100
    federationStoreState.selectedFederation = {
      title: 'Test Federation',
      federationId: 'fed-1',
      inviteCode: 'fed11test',
      modules: [],
      metadata: {
        max_invoice_msats: '50000',
      },
    }

    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: {
        writeText: clipboardWriteText,
      },
      configurable: true,
    })
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  it('shows the smaller of wallet balance and federation maximum', () => {
    wrapper = createWrapper()

    expect(wrapper.get('[data-testid="send-ecash-max-amount"]').text()).toContain('50 sats')
  })

  it('creates offline ecash and switches to the export step', async () => {
    wrapper = createWrapper()

    await wrapper.get('[data-testid="receive-keypad-btn-2"]').trigger('click')
    await wrapper.get('[data-testid="receive-keypad-btn-5"]').trigger('click')
    await wrapper.get('[data-testid="send-ecash-create-btn"]').trigger('click')
    await flushPromises()

    expect(mockSpendEcashOffline).toHaveBeenCalledWith(25)
    expect(wrapper.get('[data-testid="send-ecash-animated-qr"]').attributes('data-notes')).toBe(
      'cashuAoffline123',
    )
    expect(wrapper.find('[data-testid="send-ecash-notes-input"]').exists()).toBe(false)
    expect(mockLoadingShow).toHaveBeenCalledWith({ message: 'Creating offline eCash...' })
    expect(mockLoadingHide).toHaveBeenCalledTimes(1)
  })

  it('copies exported notes to the clipboard', async () => {
    wrapper = createWrapper()

    await wrapper.get('[data-testid="receive-keypad-btn-2"]').trigger('click')
    await wrapper.get('[data-testid="receive-keypad-btn-5"]').trigger('click')
    await wrapper.get('[data-testid="send-ecash-create-btn"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="send-ecash-copy-btn"]').trigger('click')

    expect(clipboardWriteText).toHaveBeenCalledWith('cashuAoffline123')
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'positive',
        message: 'eCash copied to clipboard',
      }),
    )
  })

  it('shares exported notes from the export step', async () => {
    wrapper = createWrapper()

    await wrapper.get('[data-testid="receive-keypad-btn-2"]').trigger('click')
    await wrapper.get('[data-testid="receive-keypad-btn-5"]').trigger('click')
    await wrapper.get('[data-testid="send-ecash-create-btn"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="send-ecash-share-btn"]').trigger('click')

    expect(mockShare).toHaveBeenCalledWith({
      title: 'eCash for 25 sats',
      text: 'cashuAoffline123',
    })
  })

  it('returns to the home page from the export step', async () => {
    wrapper = createWrapper()

    await wrapper.get('[data-testid="receive-keypad-btn-2"]').trigger('click')
    await wrapper.get('[data-testid="receive-keypad-btn-5"]').trigger('click')
    await wrapper.get('[data-testid="send-ecash-create-btn"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="send-ecash-go-home-btn"]').trigger('click')

    expect(mockRouterPush).toHaveBeenCalledWith({ name: '/' })
  })
})
