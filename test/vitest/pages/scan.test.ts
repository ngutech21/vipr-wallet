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
  const actual = await importOriginal<typeof import('quasar')>()
  return {
    ...actual,
    Notify: {
      create: mockNotifyCreate,
    },
  }
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
})
