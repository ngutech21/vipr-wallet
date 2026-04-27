import { defineComponent } from 'vue'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import ScanPage from 'src/pages/scan.vue'

const mockRouterPush = vi.hoisted(() => vi.fn())
const mockNotifyCreate = vi.hoisted(() => vi.fn())
const mockLoggerError = vi.hoisted(() => vi.fn())
const mockLoggerScannerDebug = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
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

vi.mock('src/services/logger', () => ({
  logger: {
    error: mockLoggerError,
    scanner: {
      debug: mockLoggerScannerDebug,
    },
  },
}))

vi.mock('vue-qrcode-reader', () => ({
  QrcodeStream: defineComponent({
    name: 'QrcodeStream',
    emits: ['detect', 'camera-on', 'error'],
    template: '<div />',
  }),
}))

describe('ScanPage detection flow', () => {
  let wrapper: VueWrapper

  function createWrapper() {
    return mount(ScanPage, {
      global: {
        stubs: {
          AddFederation: true,
          BottomSheetOptionCard: true,
          ModalCard: true,
          'q-page': true,
          'q-dialog': true,
          'q-btn': true,
          'q-toggle': true,
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockRouterPush.mockResolvedValue(undefined)
  })

  it('routes lightning invoice scans to send page', async () => {
    wrapper = createWrapper()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wrapper.vm as any).onDetect([{ rawValue: 'lightning:lnbc123' }])
    await flushPromises()

    expect(mockRouterPush).toHaveBeenCalledWith({
      name: '/send',
      query: { invoice: 'lnbc123' },
    })
    wrapper.unmount()
  })

  it('routes lightning address scans to send page', async () => {
    wrapper = createWrapper()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wrapper.vm as any).onDetect([{ rawValue: 'User@Example.com' }])
    await flushPromises()

    expect(mockRouterPush).toHaveBeenCalledWith({
      name: '/send',
      query: { invoice: 'user@example.com' },
    })
    wrapper.unmount()
  })

  it.each([
    ['raw LNURL', 'lnurl1dp68gurn8ghj7m'],
    ['lightning-prefixed LNURL', 'lightning:lnurl1dp68gurn8ghj7m'],
    ['web-lightning-prefixed LNURL', 'web+lightning:lnurl1dp68gurn8ghj7m'],
  ])('routes %s scans to the LNURL page', async (_label, rawValue) => {
    wrapper = createWrapper()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wrapper.vm as any).onDetect([{ rawValue }])
    await flushPromises()

    expect(mockRouterPush).toHaveBeenCalledWith({
      name: '/lnurl',
      query: { value: 'lnurl1dp68gurn8ghj7m' },
    })
    wrapper.unmount()
  })

  it('opens federation dialog for fed invite scans', async () => {
    wrapper = createWrapper()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wrapper.vm as any).onDetect([{ rawValue: 'fed1abc' }])
    await flushPromises()

    expect(mockRouterPush).not.toHaveBeenCalled()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((wrapper.vm as any).detectedContent).toBe('fed1abc')
    wrapper.unmount()
  })

  it('resumes scanning when the federation dialog is dismissed', async () => {
    wrapper = createWrapper()
    const scanPage = wrapper.vm as unknown as {
      onDetect: (codes: Array<{ rawValue: string }>) => Promise<void>
      onAddFederationHide: () => void
      scannerPaused: boolean
    }

    await scanPage.onDetect([{ rawValue: 'fed1abc' }])
    await flushPromises()

    expect(scanPage.scannerPaused).toBe(true)

    scanPage.onAddFederationHide()

    expect(scanPage.scannerPaused).toBe(false)
    wrapper.unmount()
  })

  it('routes unknown scans to receive ecash page for oob parsing', async () => {
    wrapper = createWrapper()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wrapper.vm as any).onDetect([{ rawValue: 'cashuAexample' }])
    await flushPromises()

    expect(mockRouterPush).toHaveBeenCalledWith({
      name: '/receive-ecash',
      query: { token: 'cashuAexample' },
    })
    wrapper.unmount()
  })

  it('routes bitcoin URI scans to the onchain send page', async () => {
    wrapper = createWrapper()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wrapper.vm as any).onDetect([
      { rawValue: 'bitcoin:bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080?amount=0.00021' },
    ])
    await flushPromises()

    expect(mockRouterPush).toHaveBeenCalledWith({
      path: '/send-onchain',
      query: { target: 'bitcoin:bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080?amount=0.00021' },
    })
    wrapper.unmount()
  })

  it('routes bitcoin URIs with @ in query params to the onchain send page', async () => {
    wrapper = createWrapper()
    const target =
      'bitcoin:bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080?amount=0.00021&label=alice@example.com'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wrapper.vm as any).onDetect([{ rawValue: target }])
    await flushPromises()

    expect(mockRouterPush).toHaveBeenCalledWith({
      path: '/send-onchain',
      query: { target },
    })
    wrapper.unmount()
  })

  it('asks for a payment method when bitcoin URI scans include a lightning invoice', async () => {
    wrapper = createWrapper()
    const target =
      'bitcoin:bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080?amount=0.00000021&label=Lunch&message=For%20lunch%20Tuesday&lightning=lnbc210u'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wrapper.vm as any).onDetect([{ rawValue: target }])
    await flushPromises()

    expect(mockRouterPush).not.toHaveBeenCalled()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((wrapper.vm as any).showBip21PaymentChoice).toBe(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((wrapper.vm as any).scannerPaused).toBe(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((wrapper.vm as any).bip21PaymentDetails).toEqual([
      { label: 'Amount', value: '21 sats' },
      { label: 'Label', value: 'Lunch' },
      { label: 'Message', value: 'For lunch Tuesday' },
    ])
    wrapper.unmount()
  })

  it('routes selected BIP21 lightning payments to the send page', async () => {
    wrapper = createWrapper()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wrapper.vm as any).onDetect([
      {
        rawValue:
          'bitcoin:bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080?amount=0.00021&lightning=lnbc210u',
      },
    ])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wrapper.vm as any).payBip21WithLightning()
    await flushPromises()

    expect(mockRouterPush).toHaveBeenCalledWith({
      name: '/send',
      query: { invoice: 'lnbc210u' },
    })
    wrapper.unmount()
  })

  it('routes selected BIP21 onchain payments to the onchain send page', async () => {
    wrapper = createWrapper()
    const target =
      'bitcoin:bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080?amount=0.00021&lightning=lnbc210u'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wrapper.vm as any).onDetect([{ rawValue: target }])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wrapper.vm as any).payBip21Onchain()
    await flushPromises()

    expect(mockRouterPush).toHaveBeenCalledWith({
      path: '/send-onchain',
      query: { target },
    })
    wrapper.unmount()
  })

  it('routes raw bitcoin address scans to the onchain send page without lowercasing', async () => {
    wrapper = createWrapper()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wrapper.vm as any).onDetect([{ rawValue: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy' }])
    await flushPromises()

    expect(mockRouterPush).toHaveBeenCalledWith({
      path: '/send-onchain',
      query: { target: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy' },
    })
    wrapper.unmount()
  })
})
