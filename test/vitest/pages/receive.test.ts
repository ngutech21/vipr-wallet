import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import ReceivePage from 'src/pages/receive.vue'

const mockRouterPush = vi.hoisted(() => vi.fn())
const mockCreateInvoice = vi.hoisted(() => vi.fn())
const mockSubscribeLnReceive = vi.hoisted(() => vi.fn())
const mockUnsubscribeLnReceive = vi.hoisted(() => vi.fn())
const mockUpdateBalance = vi.hoisted(() => vi.fn())
const mockRequestProvider = vi.hoisted(() => vi.fn())
const mockLoadingShow = vi.hoisted(() => vi.fn())
const mockLoadingHide = vi.hoisted(() => vi.fn())
const mockNotifyCreate = vi.hoisted(() => vi.fn())
const federationStoreState = vi.hoisted(
  (): { selectedFederation: { federationId: string } | undefined } => ({
    selectedFederation: { federationId: 'fed-1' },
  }),
)
const receiveSubscription = vi.hoisted(
  (): {
    onSuccess: ((state: unknown) => void) | undefined
    onError: ((error: string) => void) | undefined
  } => ({
    onSuccess: undefined,
    onError: undefined,
  }),
)

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}))

vi.mock('src/stores/federation', () => ({
  useFederationStore: () => ({
    get selectedFederation() {
      return federationStoreState.selectedFederation
    },
  }),
}))

vi.mock('src/composables/useLightningPayment', () => ({
  useLightningPayment: () => ({
    createInvoice: mockCreateInvoice,
  }),
}))

vi.mock('src/stores/wallet', () => ({
  useWalletStore: () => ({
    wallet: {
      lightning: {
        subscribeLnReceive: mockSubscribeLnReceive,
      },
    },
    updateBalance: mockUpdateBalance,
  }),
}))

vi.mock('@vueuse/core', () => ({
  useShare: () => ({
    share: vi.fn(),
    isSupported: false,
  }),
}))

vi.mock('@getalby/bitcoin-connect', () => ({
  init: vi.fn(),
  requestProvider: mockRequestProvider,
}))

vi.mock('quasar', async (importOriginal) => {
  const actual = await importOriginal()
  return Object.assign({}, actual, {
    Loading: {
      show: mockLoadingShow,
      hide: mockLoadingHide,
    },
    Notify: {
      create: mockNotifyCreate,
    },
  })
})

const QPageStub = {
  template: '<main><slot /></main>',
}

const QBtnStub = {
  props: {
    label: { type: String, required: false, default: '' },
    icon: { type: String, required: false, default: '' },
    disable: { type: Boolean, required: false, default: false },
    loading: { type: Boolean, required: false, default: false },
  },
  emits: ['click'],
  template: `
    <button
      v-bind="$attrs"
      :data-disabled="disable ? 'true' : 'false'"
      :data-busy="loading ? 'true' : 'false'"
      @click="$emit('click')"
    >
      <slot />
      {{ label }}{{ icon }}
    </button>
  `,
}

const QInputStub = {
  props: {
    modelValue: { type: String, required: false, default: '' },
  },
  emits: ['update:modelValue'],
  template: `
    <input
      v-bind="$attrs"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  `,
}

const CopyableQrCardStub = {
  props: {
    value: { type: String, required: true },
    containerTestId: { type: String, required: false, default: '' },
    inputTestId: { type: String, required: false, default: '' },
  },
  template: `
    <section :data-testid="containerTestId">
      <input :data-testid="inputTestId" :value="value" readonly />
    </section>
  `,
}

describe('ReceivePage Lightning receive flow', () => {
  let wrapper: VueWrapper | undefined

  function createWrapper(): VueWrapper {
    return mount(ReceivePage, {
      global: {
        stubs: {
          transition: false,
          CopyableQrCard: CopyableQrCardStub,
          FederationSelector: true,
          'q-page': QPageStub,
          'q-btn': QBtnStub,
          'q-input': QInputStub,
          'q-spinner-dots': true,
        },
      },
    })
  }

  async function enterAmount(amount: string) {
    if (wrapper == null) {
      throw new Error('Receive page wrapper is not mounted')
    }
    const activeWrapper = wrapper

    await amount.split('').reduce<Promise<void>>(async (previousClick, digit) => {
      await previousClick
      await activeWrapper.get(`[data-testid="receive-keypad-btn-${digit}"]`).trigger('click')
    }, Promise.resolve())
    await flushPromises()
  }

  async function createInvoiceFromUi(options: { amount?: string; memo?: string } = {}) {
    await enterAmount(options.amount ?? '100')
    if (options.memo != null) {
      await wrapper?.get('[data-testid="receive-memo-input"]').setValue(options.memo)
    }

    await wrapper?.get('[data-testid="receive-create-invoice-btn"]').trigger('click')
    await flushPromises()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    federationStoreState.selectedFederation = { federationId: 'fed-1' }
    receiveSubscription.onSuccess = undefined
    receiveSubscription.onError = undefined
    mockSubscribeLnReceive.mockImplementation((_operationId, onSuccess, onError) => {
      receiveSubscription.onSuccess = onSuccess
      receiveSubscription.onError = onError
      return mockUnsubscribeLnReceive
    })
    mockUpdateBalance.mockResolvedValue(undefined)
    mockRouterPush.mockResolvedValue(undefined)
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('subscribes for payment after invoice creation and navigates when claimed', async () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
    mockCreateInvoice.mockResolvedValue({
      type: 'success',
      invoice: 'lnbc123',
      operationId: 'op-1',
      amountMsats: 100_000,
    })

    wrapper = createWrapper()
    await createInvoiceFromUi()

    expect(mockCreateInvoice).toHaveBeenCalledWith(100, '', 3540)
    expect(mockSubscribeLnReceive).toHaveBeenCalledWith(
      'op-1',
      expect.any(Function),
      expect.any(Function),
    )
    expect(wrapper.get('[data-testid="receive-invoice-input"]').element).toHaveProperty(
      'value',
      'lnbc123',
    )
    expect(mockRouterPush).not.toHaveBeenCalled()

    receiveSubscription.onSuccess?.('claimed')
    await flushPromises()

    expect(mockUnsubscribeLnReceive).toHaveBeenCalled()
    expect(mockUpdateBalance).toHaveBeenCalledTimes(1)
    expect(mockRouterPush).toHaveBeenCalledWith({
      name: '/received-lightning',
      query: { amount: '100' },
    })
    expect(clearIntervalSpy).toHaveBeenCalled()
  })

  it('uses the optional memo when creating an invoice', async () => {
    mockCreateInvoice.mockResolvedValue({
      type: 'error',
      error: new Error('Creation failed'),
    })

    wrapper = createWrapper()
    await createInvoiceFromUi({ memo: '  invoice memo  ' })

    expect(mockCreateInvoice).toHaveBeenCalledWith(100, 'invoice memo', 3540)
  })

  it('does not create an invoice when no federation is selected', async () => {
    federationStoreState.selectedFederation = undefined

    wrapper = createWrapper()
    await createInvoiceFromUi()

    expect(mockCreateInvoice).not.toHaveBeenCalled()
    expect(mockSubscribeLnReceive).not.toHaveBeenCalled()
    expect(mockNotifyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        color: 'negative',
        message: 'Select a federation before creating an invoice',
      }),
    )
  })

  it('does not subscribe for payment when invoice creation fails', async () => {
    mockCreateInvoice.mockResolvedValue({ type: 'error', error: new Error('Creation failed') })

    wrapper = createWrapper()
    await createInvoiceFromUi()

    expect(mockSubscribeLnReceive).not.toHaveBeenCalled()
    expect(mockRouterPush).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="receive-invoice-input"]').exists()).toBe(false)
  })

  it('clears countdown timer and subscription on unmount while invoice is waiting', async () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
    mockCreateInvoice.mockResolvedValue({
      type: 'success',
      invoice: 'lnbc123',
      operationId: 'op-1',
      amountMsats: 100_000,
    })

    wrapper = createWrapper()
    await createInvoiceFromUi()

    const clearCallsBeforeUnmount = clearIntervalSpy.mock.calls.length
    wrapper.unmount()

    expect(clearIntervalSpy.mock.calls.length).toBeGreaterThan(clearCallsBeforeUnmount)
    expect(mockUnsubscribeLnReceive).toHaveBeenCalled()
  })

  it('always hides loading when bitcoin provider lookup fails', async () => {
    mockCreateInvoice.mockResolvedValue({
      type: 'success',
      invoice: 'lnbc123',
      operationId: 'op-1',
      amountMsats: 100_000,
    })
    mockRequestProvider.mockRejectedValueOnce(new Error('Provider unavailable'))

    wrapper = createWrapper()
    await createInvoiceFromUi()
    await wrapper.get('[data-testid="receive-pay-with-wallet-btn"]').trigger('click')
    await flushPromises()

    expect(mockLoadingShow).toHaveBeenCalledWith({
      message: 'Paying with connected Bitcoin wallet',
    })
    expect(mockLoadingHide).toHaveBeenCalledTimes(1)
    expect(mockNotifyCreate).toHaveBeenCalledTimes(1)
  })

  it('always hides loading when provider payment fails', async () => {
    const sendPayment = vi.fn().mockRejectedValueOnce(new Error('Payment failed'))
    mockCreateInvoice.mockResolvedValue({
      type: 'success',
      invoice: 'lnbc123',
      operationId: 'op-1',
      amountMsats: 100_000,
    })
    mockRequestProvider.mockResolvedValueOnce({ sendPayment })

    wrapper = createWrapper()
    await createInvoiceFromUi()
    await wrapper.get('[data-testid="receive-pay-with-wallet-btn"]').trigger('click')
    await flushPromises()

    expect(sendPayment).toHaveBeenCalledWith('lnbc123')
    expect(mockLoadingHide).toHaveBeenCalledTimes(1)
    expect(mockNotifyCreate).toHaveBeenCalledTimes(1)
  })

  it('returns from invoice display to amount entry before leaving receive flow', async () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
    mockCreateInvoice.mockResolvedValue({
      type: 'success',
      invoice: 'lnbc123',
      operationId: 'op-1',
      amountMsats: 100_000,
    })

    wrapper = createWrapper()
    await createInvoiceFromUi()

    expect(wrapper.find('[data-testid="receive-invoice-input"]').exists()).toBe(true)

    await wrapper.get('[data-testid="receive-back-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="receive-invoice-input"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="receive-create-invoice-btn"]').exists()).toBe(true)
    expect(mockRouterPush).not.toHaveBeenCalledWith({ name: '/' })
    expect(clearIntervalSpy).toHaveBeenCalled()
    expect(mockUnsubscribeLnReceive).toHaveBeenCalled()

    receiveSubscription.onSuccess?.('claimed')
    await flushPromises()

    expect(mockRouterPush).not.toHaveBeenCalledWith({
      name: '/received-lightning',
      query: { amount: '100' },
    })
  })

  it('returns home when the receive flow is idle', async () => {
    wrapper = createWrapper()

    const backClick = wrapper.get('[data-testid="receive-back-btn"]').trigger('click')
    await vi.advanceTimersByTimeAsync(500)
    await backClick
    await flushPromises()

    expect(mockRouterPush).toHaveBeenCalledWith({ name: '/' })
  })
})
