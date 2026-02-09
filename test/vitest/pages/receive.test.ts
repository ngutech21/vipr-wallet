import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import ReceivePage from 'src/pages/receive.vue'

const mockRouterPush = vi.hoisted(() => vi.fn())
const mockCreateInvoice = vi.hoisted(() => vi.fn())
const mockWaitForInvoicePayment = vi.hoisted(() => vi.fn())
const mockAmountRef = vi.hoisted(() => ({ value: 100, __v_isRef: true }))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}))

vi.mock('src/stores/federation', () => ({
  useFederationStore: () => ({
    selectedFederation: { federationId: 'fed-1' },
  }),
}))

vi.mock('src/composables/useLightningPayment', () => ({
  useLightningPayment: () => ({
    createInvoice: mockCreateInvoice,
    waitForInvoicePayment: mockWaitForInvoicePayment,
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
  requestProvider: vi.fn(),
}))

vi.mock('quasar', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    Loading: {
      show: vi.fn(),
      hide: vi.fn(),
    },
  }
})

describe('ReceivePage timer lifecycle', () => {
  let wrapper: VueWrapper

  function createWrapper(): VueWrapper {
    return mount(ReceivePage, {
      global: {
        stubs: {
          transition: false,
          QrcodeVue: true,
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
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.useRealTimers()
  })

  it('clears countdown timer after successful payment flow', async () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
    mockCreateInvoice.mockResolvedValue({
      success: true,
      invoice: 'lnbc123',
      operationId: 'op-1',
    })
    mockWaitForInvoicePayment.mockResolvedValue({ success: true })

    wrapper = createWrapper()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wrapper.vm as any).onRequest()
    await flushPromises()

    expect(mockCreateInvoice).toHaveBeenCalledWith(100, 'minting ecash', 1200)
    expect(mockWaitForInvoicePayment).toHaveBeenCalledWith('op-1', 1200000)
    expect(mockRouterPush).toHaveBeenCalledWith({
      name: '/received-lightning',
      query: { amount: '100' },
    })
    expect(clearIntervalSpy).toHaveBeenCalled()
  })

  it('clears countdown timer when invoice creation fails', async () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
    mockCreateInvoice.mockResolvedValue({ success: false })

    wrapper = createWrapper()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wrapper.vm as any).onRequest()
    await flushPromises()

    expect(mockWaitForInvoicePayment).not.toHaveBeenCalled()
    expect(mockRouterPush).not.toHaveBeenCalled()
    expect(clearIntervalSpy).toHaveBeenCalled()
  })

  it('clears countdown timer on unmount while request is still pending', async () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
    let resolveCreateInvoice: ((value: { success: boolean }) => void) | undefined

    mockCreateInvoice.mockImplementation(
      () =>
        new Promise<{ success: boolean }>((resolve) => {
          resolveCreateInvoice = resolve
        }),
    )

    wrapper = createWrapper()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requestPromise = (wrapper.vm as any).onRequest()
    await Promise.resolve()

    const clearCallsBeforeUnmount = clearIntervalSpy.mock.calls.length
    wrapper.unmount()

    expect(clearIntervalSpy.mock.calls.length).toBeGreaterThan(clearCallsBeforeUnmount)

    resolveCreateInvoice?.({ success: false })
    await requestPromise
  })
})
