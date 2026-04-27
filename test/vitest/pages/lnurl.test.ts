import { reactive } from 'vue'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import LnurlPage from 'src/pages/lnurl.vue'

const mockRouterPush = vi.hoisted(() => vi.fn())
const mockUseRoute = vi.hoisted(() => vi.fn())
const mockResolveLnurl = vi.hoisted(() => vi.fn())
const mockSubmitLnurlWithdrawInvoice = vi.hoisted(() => vi.fn())
const mockCreateInvoice = vi.hoisted(() => vi.fn())
const mockNotifyCreate = vi.hoisted(() => vi.fn())
const amountRef = vi.hoisted(() => ({ value: 0, __v_isRef: true }))
const mockSetValue = vi.hoisted(() =>
  vi.fn((nextValue: number) => {
    amountRef.value = nextValue
  }),
)

const qBtnStub = {
  emits: ['click'],
  template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
}

vi.mock('vue-router', () => ({
  useRoute: (...args: unknown[]) => mockUseRoute(...args),
  useRouter: () => ({
    push: mockRouterPush,
  }),
}))

vi.mock('src/utils/lnurl', () => ({
  resolveLnurl: mockResolveLnurl,
  submitLnurlWithdrawInvoice: mockSubmitLnurlWithdrawInvoice,
}))

vi.mock('src/composables/useLightningPayment', () => ({
  useLightningPayment: () => ({
    createInvoice: mockCreateInvoice,
  }),
}))

vi.mock('src/composables/useNumericInput', () => ({
  useNumericInput: () => ({
    value: amountRef,
    keypadButtons: [],
    setValue: mockSetValue,
  }),
}))

vi.mock('quasar', async (importOriginal) => {
  const actual = await importOriginal()
  return Object.assign({}, actual, {
    Notify: {
      create: mockNotifyCreate,
    },
  })
})

describe('LnurlPage', () => {
  type RouteState = { query: { value?: string | string[] } }

  let routeState: RouteState
  let wrapper: VueWrapper

  function createWrapper() {
    return mount(LnurlPage, {
      global: {
        stubs: {
          transition: false,
          AmountDisplay: true,
          NumericKeypad: true,
          'q-page': {
            template: '<div><slot /></div>',
          },
          'q-btn': qBtnStub,
          'q-icon': {
            template: '<span><slot /></span>',
          },
          'q-spinner-dots': true,
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    routeState = reactive<RouteState>({
      query: { value: 'lnurl1test' },
    })
    mockUseRoute.mockImplementation(() => routeState)
    mockRouterPush.mockResolvedValue(undefined)
    mockSubmitLnurlWithdrawInvoice.mockResolvedValue(undefined)
    mockCreateInvoice.mockResolvedValue({
      success: true,
      invoice: 'lnbc100n1test',
    })
    amountRef.value = 0
  })

  it('routes LNURL pay requests to the existing send page', async () => {
    mockResolveLnurl.mockResolvedValue({
      tag: 'payRequest',
      callback: 'https://example.com/callback',
    })

    wrapper = createWrapper()
    await flushPromises()

    expect(mockRouterPush).toHaveBeenCalledWith({
      name: '/send',
      query: { invoice: 'lnurl1test' },
    })
    wrapper.unmount()
  })

  it('shows withdraw request details and defaults to the maximum amount', async () => {
    mockResolveLnurl.mockResolvedValue({
      tag: 'withdrawRequest',
      callback: 'https://example.com/callback',
      k1: 'withdraw-secret',
      defaultDescription: 'ATM withdrawal',
      minWithdrawable: 1000,
      maxWithdrawable: 100000,
    })

    wrapper = createWrapper()
    await flushPromises()

    expect(mockSetValue).toHaveBeenCalledWith(100)
    expect(wrapper.text()).toContain('ATM withdrawal')
    expect(wrapper.text()).toContain('1 - 100 sats')
    wrapper.unmount()
  })

  it('creates an invoice and submits it to the withdraw callback', async () => {
    mockResolveLnurl.mockResolvedValue({
      tag: 'withdrawRequest',
      callback: 'https://example.com/callback',
      k1: 'withdraw-secret',
      defaultDescription: 'ATM withdrawal',
      minWithdrawable: 1000,
      maxWithdrawable: 100000,
    })

    wrapper = createWrapper()
    await flushPromises()
    await wrapper.get('[data-testid="lnurl-withdraw-submit-btn"]').trigger('click')
    await flushPromises()

    expect(mockCreateInvoice).toHaveBeenCalledWith(100, 'ATM withdrawal')
    expect(mockSubmitLnurlWithdrawInvoice).toHaveBeenCalledWith(
      {
        tag: 'withdrawRequest',
        callback: 'https://example.com/callback',
        k1: 'withdraw-secret',
        defaultDescription: 'ATM withdrawal',
        minWithdrawable: 1000,
        maxWithdrawable: 100000,
      },
      'lnbc100n1test',
    )
    expect(wrapper.find('[data-testid="lnurl-withdraw-success"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('strips lightning URI prefixes before resolving LNURL', async () => {
    routeState.query.value = 'web+lightning:lnurl1test'
    mockResolveLnurl.mockResolvedValue({
      tag: 'payRequest',
      callback: 'https://example.com/callback',
    })

    wrapper = createWrapper()
    await flushPromises()

    expect(mockResolveLnurl).toHaveBeenCalledWith('lnurl1test')
    wrapper.unmount()
  })
})
