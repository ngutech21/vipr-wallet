import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import ReceivePage from 'src/pages/receive.vue'

const mockRouterPush = vi.hoisted(() => vi.fn())
const mockCreateInvoice = vi.hoisted(() => vi.fn())
const mockSubscribeLnReceive = vi.hoisted(() => vi.fn())
const mockUnsubscribeLnReceive = vi.hoisted(() => vi.fn())
const mockUpdateBalance = vi.hoisted(() => vi.fn())
const mockAmountRef = vi.hoisted(() => ({ value: 100, __v_isRef: true }))
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

vi.mock('src/composables/useNumericInput', () => ({
  useNumericInput: () => ({
    value: mockAmountRef,
    keypadButtons: [],
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

describe('ReceivePage timer lifecycle', () => {
  let wrapper: VueWrapper

  function createWrapper(): VueWrapper {
    return mount(ReceivePage, {
      global: {
        stubs: {
          transition: false,
          CopyableQrCard: true,
          'q-page': true,
          'q-toolbar': true,
          'q-btn': true,
          'q-toolbar-title': true,
          'q-input': true,
          'q-card': true,
          'q-card-section': true,
          'q-separator': true,
          'q-icon': true,
          'q-spinner': true,
          'q-spinner-dots': true,
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockAmountRef.value = 100
    federationStoreState.selectedFederation = { federationId: 'fed-1' }
    receiveSubscription.onSuccess = undefined
    receiveSubscription.onError = undefined
    mockSubscribeLnReceive.mockImplementation((_operationId, onSuccess, onError) => {
      receiveSubscription.onSuccess = onSuccess
      receiveSubscription.onError = onError
      return mockUnsubscribeLnReceive
    })
    mockUpdateBalance.mockResolvedValue(undefined)
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.useRealTimers()
  })

  it('subscribes for payment after invoice creation and navigates when claimed', async () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
    mockCreateInvoice.mockResolvedValue({
      success: true,
      invoice: 'lnbc123',
      operationId: 'op-1',
    })

    wrapper = createWrapper()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wrapper.vm as any).onRequest()
    await flushPromises()

    expect(mockCreateInvoice).toHaveBeenCalledWith(100, '', 3540)
    expect(mockSubscribeLnReceive).toHaveBeenCalledWith(
      'op-1',
      expect.any(Function),
      expect.any(Function),
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
      success: false,
    })

    wrapper = createWrapper()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(wrapper.vm as any).invoiceMemo = '  invoice memo  '
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wrapper.vm as any).onRequest()
    await flushPromises()

    expect(mockCreateInvoice).toHaveBeenCalledWith(100, 'invoice memo', 3540)
  })

  it('does not create an invoice when no federation is selected', async () => {
    federationStoreState.selectedFederation = undefined

    wrapper = createWrapper()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wrapper.vm as any).onRequest()
    await flushPromises()

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
    mockCreateInvoice.mockResolvedValue({ success: false })

    wrapper = createWrapper()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wrapper.vm as any).onRequest()
    await flushPromises()

    expect(mockSubscribeLnReceive).not.toHaveBeenCalled()
    expect(mockRouterPush).not.toHaveBeenCalled()
  })

  it('clears countdown timer and subscription on unmount while invoice is waiting', async () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
    mockCreateInvoice.mockResolvedValue({
      success: true,
      invoice: 'lnbc123',
      operationId: 'op-1',
    })

    wrapper = createWrapper()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wrapper.vm as any).onRequest()
    await flushPromises()

    const clearCallsBeforeUnmount = clearIntervalSpy.mock.calls.length
    wrapper.unmount()

    expect(clearIntervalSpy.mock.calls.length).toBeGreaterThan(clearCallsBeforeUnmount)
    expect(mockUnsubscribeLnReceive).toHaveBeenCalled()
  })

  it('always hides loading when bitcoin provider lookup fails', async () => {
    mockRequestProvider.mockRejectedValueOnce(new Error('Provider unavailable'))

    wrapper = createWrapper()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wrapper.vm as any).payWithBitcoinConnect()
    await flushPromises()

    expect(mockLoadingShow).toHaveBeenCalledWith({
      message: 'Paying with connected Bitcoin wallet',
    })
    expect(mockLoadingHide).toHaveBeenCalledTimes(1)
    expect(mockNotifyCreate).toHaveBeenCalledTimes(1)
  })

  it('always hides loading when provider payment fails', async () => {
    const sendPayment = vi.fn().mockRejectedValueOnce(new Error('Payment failed'))
    mockRequestProvider.mockResolvedValueOnce({ sendPayment })

    wrapper = createWrapper()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wrapper.vm as any).payWithBitcoinConnect()
    await flushPromises()

    expect(sendPayment).toHaveBeenCalledWith('')
    expect(mockLoadingHide).toHaveBeenCalledTimes(1)
    expect(mockNotifyCreate).toHaveBeenCalledTimes(1)
  })

  it('returns from invoice display to amount entry before leaving receive flow', async () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
    mockCreateInvoice.mockResolvedValue({
      success: true,
      invoice: 'lnbc123',
      operationId: 'op-1',
    })

    wrapper = createWrapper()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wrapper.vm as any).onRequest()
    await flushPromises()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((wrapper.vm as any).qrData).toBe('lnbc123')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wrapper.vm as any).goBack()
    await flushPromises()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((wrapper.vm as any).qrData).toBe('')
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
})
