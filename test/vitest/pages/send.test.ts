import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import SendPage from 'src/pages/send.vue'

const mockRouterPush = vi.hoisted(() => vi.fn())
const mockDecodeInvoiceFromComposable = vi.hoisted(() => vi.fn())
const mockCreateInvoiceFromInput = vi.hoisted(() => vi.fn())
const mockPayInvoiceFromComposable = vi.hoisted(() => vi.fn())
const mockUseRoute = vi.hoisted(() => vi.fn())

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
    decodedInvoice: ref<Record<string, unknown> | null>(null),
    decodeInvoice: mockDecodeInvoiceFromComposable,
    createInvoiceFromInput: mockCreateInvoiceFromInput,
  }),
}))

vi.mock('src/composables/useLightningPayment', () => ({
  useLightningPayment: () => ({
    payInvoice: mockPayInvoiceFromComposable,
  }),
}))

describe('SendPage query invoice handling', () => {
  type QueryInvoice = string | string[] | undefined
  type RouteState = { query: { invoice?: QueryInvoice } }

  let routeState: RouteState
  let wrapper: VueWrapper

  function createWrapper() {
    return mount(SendPage, {
      global: {
        stubs: {
          transition: false,
          VerifyPayment: true,
          'q-page': true,
          'q-toolbar': true,
          'q-btn': true,
          'q-toolbar-title': true,
          'q-card': true,
          'q-card-section': true,
          'q-input': true,
          'q-slide-transition': true,
          'q-spinner-dots': true,
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
})
