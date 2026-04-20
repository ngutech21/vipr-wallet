import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import SendPage from 'src/pages/send.vue'

const mockRouterPush = vi.hoisted(() => vi.fn())
const mockDecodeInvoiceFromComposable = vi.hoisted(() => vi.fn())
const mockCreateInvoiceFromInput = vi.hoisted(() => vi.fn())
const mockPayInvoiceFromComposable = vi.hoisted(() => vi.fn())
const mockUseRoute = vi.hoisted(() => vi.fn())
const mockDecodedInvoiceRef = vi.hoisted(() => ({
  value: null as Record<string, unknown> | null,
  __v_isRef: true,
}))
const mockNostrStore = vi.hoisted(() => ({
  contacts: [] as Array<{
    pubkey: string
    npub: string
    paymentTarget: string
    displayName?: string
    name?: string
    nip05?: string
    picture?: string
    lud16?: string
    lud06?: string
  }>,
  getSuggestedContacts: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: (...args: unknown[]) => mockUseRoute(...args),
  useRouter: () => ({
    push: mockRouterPush,
  }),
}))

vi.mock('src/composables/useInvoiceDecoding', () => ({
  useInvoiceDecoding: () => ({
    isProcessing: ref(false),
    amountRequired: ref(false),
    lnAddress: ref(''),
    decodedInvoice: mockDecodedInvoiceRef,
    decodeInvoice: mockDecodeInvoiceFromComposable,
    createInvoiceFromInput: mockCreateInvoiceFromInput,
  }),
}))

vi.mock('src/composables/useLightningPayment', () => ({
  useLightningPayment: () => ({
    payInvoice: mockPayInvoiceFromComposable,
  }),
}))

vi.mock('src/stores/nostr', () => ({
  useNostrStore: () => mockNostrStore,
}))

describe('SendPage query invoice handling', () => {
  type QueryInvoice = string | string[] | undefined
  type RouteState = { query: { invoice?: QueryInvoice } }

  let routeState: RouteState
  let wrapper: VueWrapper

  const QItemStub = {
    emits: ['click'],
    template: '<button v-bind="$attrs" type="button" @click="$emit(\'click\')"><slot /></button>',
  }

  const SlotStub = {
    template: '<div v-bind="$attrs"><slot /></div>',
  }

  function createWrapper() {
    return mount(SendPage, {
      global: {
        stubs: {
          transition: false,
          VerifyPayment: true,
          'q-page': SlotStub,
          'q-toolbar': SlotStub,
          'q-btn': SlotStub,
          'q-toolbar-title': SlotStub,
          'q-card': SlotStub,
          'q-card-section': SlotStub,
          'q-input': SlotStub,
          'q-slide-transition': SlotStub,
          'q-spinner-dots': SlotStub,
          'q-list': SlotStub,
          'q-item': QItemStub,
          'q-item-section': SlotStub,
          'q-item-label': SlotStub,
          'q-icon': SlotStub,
          'q-avatar': SlotStub,
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    routeState = reactive<RouteState>({
      query: {
        invoice: undefined,
      },
    })
    mockUseRoute.mockImplementation(() => routeState)
    mockDecodeInvoiceFromComposable.mockResolvedValue(undefined)
    mockCreateInvoiceFromInput.mockResolvedValue(undefined)
    mockPayInvoiceFromComposable.mockResolvedValue({ success: true, amountSats: 1, fee: 0 })
    mockDecodedInvoiceRef.value = null
    mockNostrStore.contacts = []
    mockNostrStore.getSuggestedContacts.mockReturnValue([])
  })

  it('strips lightning prefix and decodes invoice from query', async () => {
    routeState.query.invoice = 'lightning:lnbc123'
    wrapper = createWrapper()
    await flushPromises()

    expect(mockDecodeInvoiceFromComposable).toHaveBeenCalledWith('lnbc123')
    wrapper.unmount()
  })

  it('uses first query entry when invoice is provided as an array', async () => {
    routeState.query.invoice = ['web+lightning:lnbc999', 'lnbc-ignored']
    wrapper = createWrapper()
    await flushPromises()

    expect(mockDecodeInvoiceFromComposable).toHaveBeenCalledWith('lnbc999')
    wrapper.unmount()
  })

  it('reacts to route query invoice updates after mount', async () => {
    routeState.query.invoice = 'lnbc1'
    wrapper = createWrapper()
    await flushPromises()
    expect(mockDecodeInvoiceFromComposable).toHaveBeenCalledWith('lnbc1')

    routeState.query.invoice = 'lnbc2'
    await flushPromises()

    expect(mockDecodeInvoiceFromComposable).toHaveBeenCalledWith('lnbc2')
    expect(mockDecodeInvoiceFromComposable).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })

  it('shows the empty contacts state when no contacts are imported', async () => {
    wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('Kontakte')
    expect(wrapper.text()).toContain('Keine Kontakte')
    expect(wrapper.find('[data-testid="send-no-contacts"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows synced contact suggestions and decodes the selected contact target', async () => {
    mockNostrStore.contacts = [
      {
        pubkey: 'a'.repeat(64),
        npub: 'npub1example',
        paymentTarget: 'alice@getalby.com',
        displayName: 'Alice',
        lud16: 'alice@getalby.com',
      },
    ]
    mockNostrStore.getSuggestedContacts.mockReturnValue(mockNostrStore.contacts)

    wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('Alice')
    await wrapper
      .find(
        '[data-testid="send-contact-item-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]',
      )
      .trigger('click')

    expect(mockNostrStore.getSuggestedContacts).toHaveBeenCalled()
    expect(mockDecodeInvoiceFromComposable).toHaveBeenCalledWith('alice@getalby.com')
    wrapper.unmount()
  })

  it('pays the decoded bolt11 invoice instead of the original lightning address input', async () => {
    mockDecodedInvoiceRef.value = {
      invoice: 'lnbc1decodedinvoice',
      amount: 123,
      description: 'test',
      paymentHash: 'hash',
      timestamp: 0,
      expiry: 60,
    }

    wrapper = mount(SendPage, {
      global: {
        stubs: {
          transition: false,
          VerifyPayment: {
            template: '<button data-testid="verify-pay" @click="$emit(\'pay\')">pay</button>',
          },
          'q-page': SlotStub,
          'q-toolbar': SlotStub,
          'q-btn': SlotStub,
          'q-toolbar-title': SlotStub,
          'q-card': SlotStub,
          'q-card-section': SlotStub,
          'q-input': SlotStub,
          'q-slide-transition': SlotStub,
          'q-spinner-dots': SlotStub,
          'q-list': SlotStub,
          'q-item': QItemStub,
          'q-item-section': SlotStub,
          'q-item-label': SlotStub,
          'q-icon': SlotStub,
          'q-avatar': SlotStub,
        },
      },
    })

    await wrapper.find('[data-testid="verify-pay"]').trigger('click')
    await flushPromises()

    expect(mockPayInvoiceFromComposable).toHaveBeenCalledWith('lnbc1decodedinvoice', 123)
    expect(mockRouterPush).toHaveBeenCalledWith({
      path: '/sent-lightning',
      query: {
        amount: 1,
        fee: 0,
      },
    })
    wrapper.unmount()
  })
})
