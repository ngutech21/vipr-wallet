import { defineComponent } from 'vue'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import ScanPage from 'src/pages/scan.vue'
import { buildEcashQrFrames } from 'src/utils/ecashQrFrames'

const mockRouterPush = vi.hoisted(() => vi.fn())
const mockUseRoute = vi.hoisted(() => vi.fn())
const mockNotifyCreate = vi.hoisted(() => vi.fn())
const mockLoggerError = vi.hoisted(() => vi.fn())
const mockLoggerScannerDebug = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRoute: (...args: unknown[]) => mockUseRoute(...args),
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
    template: '<div data-testid="qrcode-stream" />',
  }),
}))

const QPageStub = {
  template: '<main><slot /></main>',
}

const QDialogStub = {
  props: {
    modelValue: { type: Boolean, default: false },
  },
  emits: ['hide'],
  template: `
    <section v-if="modelValue" data-testid="scan-dialog">
      <slot />
      <button data-testid="scan-dialog-hide-btn" @click="$emit('hide')" />
    </section>
  `,
}

const QBtnStub = {
  props: {
    label: { type: String, required: false, default: '' },
    icon: { type: String, required: false, default: '' },
  },
  emits: ['click'],
  template: '<button v-bind="$attrs" @click="$emit(\'click\')">{{ label }}{{ icon }}</button>',
}

const QToggleStub = {
  template: '<input v-bind="$attrs" type="checkbox" />',
}

const AddFederationStub = {
  props: {
    initialInviteCode: { type: String, required: false, default: '' },
  },
  emits: ['close'],
  template: `
    <section data-testid="scan-add-federation" :data-invite-code="initialInviteCode">
      <button data-testid="scan-add-federation-close-btn" @click="$emit('close')" />
    </section>
  `,
}

const BottomSheetOptionCardStub = {
  props: {
    title: { type: String, required: false, default: '' },
  },
  emits: ['select'],
  template: '<button v-bind="$attrs" @click="$emit(\'select\')">{{ title }}</button>',
}

const ModalCardStub = {
  template: '<section><slot /></section>',
}

describe('ScanPage detection flow', () => {
  type RouteState = {
    query: {
      returnTo?: string
      invoice?: string
      amount?: string
      memo?: string
      target?: string
      token?: string
    }
  }

  let wrapper: VueWrapper
  let routeState: RouteState

  function createWrapper() {
    return mount(ScanPage, {
      global: {
        stubs: {
          AddFederation: AddFederationStub,
          BottomSheetOptionCard: BottomSheetOptionCardStub,
          ModalCard: ModalCardStub,
          'q-page': QPageStub,
          'q-dialog': QDialogStub,
          'q-btn': QBtnStub,
          'q-toggle': QToggleStub,
        },
      },
    })
  }

  async function emitDetected(rawValue: string) {
    wrapper.findComponent({ name: 'QrcodeStream' }).vm.$emit('detect', [{ rawValue }])
    await flushPromises()
  }

  async function clickBackButton() {
    await wrapper.get('[data-testid="scan-back-btn"]').trigger('click')
    await flushPromises()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    routeState = {
      query: {},
    }
    mockUseRoute.mockImplementation(() => routeState)
    mockRouterPush.mockResolvedValue(undefined)
  })

  it('routes lightning invoice scans to send page', async () => {
    wrapper = createWrapper()
    await emitDetected('lightning:lnbc123')

    expect(mockRouterPush).toHaveBeenCalledWith({
      name: '/send',
      query: { invoice: 'lnbc123' },
    })
    wrapper.unmount()
  })

  it('returns to the send draft when scanner was opened from send', async () => {
    routeState.query = {
      returnTo: 'send',
      invoice: 'alice@example.com',
      amount: '42',
      memo: 'Dinner',
    }

    wrapper = createWrapper()
    await clickBackButton()

    expect(mockRouterPush).toHaveBeenCalledWith({
      name: '/send',
      query: {
        restoreDraft: '1',
        invoice: 'alice@example.com',
        amount: '42',
        memo: 'Dinner',
      },
    })
    wrapper.unmount()
  })

  it('returns to the onchain send draft when scanner was opened from onchain send', async () => {
    routeState.query = {
      returnTo: 'send-onchain',
      target: 'bitcoin:bc1qexample',
      amount: '21',
    }

    wrapper = createWrapper()
    await clickBackButton()

    expect(mockRouterPush).toHaveBeenCalledWith({
      name: '/send-onchain',
      query: {
        target: 'bitcoin:bc1qexample',
        amount: '21',
      },
    })
    wrapper.unmount()
  })

  it('returns to the receive ecash draft when scanner was opened from receive ecash', async () => {
    routeState.query = {
      returnTo: 'receive-ecash',
      token: 'cashuAdraft',
    }

    wrapper = createWrapper()
    await clickBackButton()

    expect(mockRouterPush).toHaveBeenCalledWith({
      name: '/receive-ecash',
      query: {
        token: 'cashuAdraft',
      },
    })
    wrapper.unmount()
  })

  it('ignores duplicate detections while navigation is still in progress', async () => {
    let resolveNavigation: (() => void) | undefined
    mockRouterPush.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveNavigation = resolve
        }),
    )

    wrapper = createWrapper()
    const stream = wrapper.findComponent({ name: 'QrcodeStream' })

    stream.vm.$emit('detect', [{ rawValue: 'lightning:lnbc123' }])
    await Promise.resolve()
    stream.vm.$emit('detect', [{ rawValue: 'lightning:lnbc123' }])
    await flushPromises()

    expect(mockRouterPush).toHaveBeenCalledTimes(1)
    expect(mockRouterPush).toHaveBeenCalledWith({
      name: '/send',
      query: { invoice: 'lnbc123' },
    })

    resolveNavigation?.()
    await flushPromises()
    wrapper.unmount()
  })

  it('routes lightning address scans to send page', async () => {
    wrapper = createWrapper()
    await emitDetected('User@Example.com')

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
    await emitDetected(rawValue)

    expect(mockRouterPush).toHaveBeenCalledWith({
      name: '/lnurl',
      query: { value: 'lnurl1dp68gurn8ghj7m' },
    })
    wrapper.unmount()
  })

  it('opens federation dialog for fed invite scans', async () => {
    wrapper = createWrapper()
    await emitDetected('fed1abc')

    expect(mockRouterPush).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="scan-add-federation"]').attributes('data-invite-code')).toBe(
      'fed1abc',
    )
    wrapper.unmount()
  })

  it('resumes scanning when the federation dialog is dismissed', async () => {
    wrapper = createWrapper()
    await emitDetected('fed1abc')

    await wrapper.get('[data-testid="scan-dialog-hide-btn"]').trigger('click')
    await emitDetected('lightning:lnbc123')

    expect(mockRouterPush).toHaveBeenCalledWith({
      name: '/send',
      query: { invoice: 'lnbc123' },
    })
    wrapper.unmount()
  })

  it('closes the federation flow to the home page', async () => {
    wrapper = createWrapper()
    await emitDetected('fed1abc')

    await wrapper.get('[data-testid="scan-add-federation-close-btn"]').trigger('click')
    await flushPromises()

    expect(mockRouterPush).toHaveBeenCalledWith({ name: '/' })
    wrapper.unmount()
  })

  it('routes unknown scans to receive ecash page for oob parsing', async () => {
    wrapper = createWrapper()
    await emitDetected('cashuAexample')

    expect(mockRouterPush).toHaveBeenCalledWith({
      name: '/receive-ecash',
      query: { token: 'cashuAexample' },
    })
    wrapper.unmount()
  })

  it('collects animated ecash QR frames before routing to receive ecash', async () => {
    const token = 'cashuAanimated-token-payload'.repeat(10)
    const frames = buildEcashQrFrames(token, 40)
    expect(frames.length).toBeGreaterThan(1)

    wrapper = createWrapper()
    const firstFrame = frames[0]
    const lastFrame = frames.at(-1)
    if (firstFrame == null || lastFrame == null) {
      throw new Error('Expected animated ecash frames')
    }

    await emitDetected(firstFrame)
    expect(mockRouterPush).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="scan-detected-text"]').text()).toContain('1/')

    /* eslint-disable no-await-in-loop */
    for (const frame of frames.slice(1, -1)) {
      if (mockRouterPush.mock.calls.length > 0) {
        break
      }

      await emitDetected(frame)
    }
    /* eslint-enable no-await-in-loop */

    if (mockRouterPush.mock.calls.length === 0) {
      await emitDetected(lastFrame)
    }

    expect(mockRouterPush).toHaveBeenCalledWith({
      name: '/receive-ecash',
      query: { token },
    })
    wrapper.unmount()
  })

  it('keeps non-ecash scan routing immediate after seeing an incomplete animated ecash frame', async () => {
    const [firstFrame] = buildEcashQrFrames('cashuAanimated-token-payload'.repeat(10), 40)
    if (firstFrame == null) {
      throw new Error('Expected animated ecash frames')
    }

    wrapper = createWrapper()
    await emitDetected(firstFrame)

    expect(mockRouterPush).not.toHaveBeenCalled()

    await emitDetected('lightning:lnbc123')

    expect(mockRouterPush).toHaveBeenCalledWith({
      name: '/send',
      query: { invoice: 'lnbc123' },
    })
    wrapper.unmount()
  })

  it('routes bitcoin URI scans to the onchain send page', async () => {
    wrapper = createWrapper()
    await emitDetected('bitcoin:bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080?amount=0.00021')

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
    await emitDetected(target)

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
    await emitDetected(target)

    expect(mockRouterPush).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="scan-bip21-summary"]').text()).toContain('21 sats')
    expect(wrapper.get('[data-testid="scan-bip21-summary"]').text()).toContain('Lunch')
    expect(wrapper.get('[data-testid="scan-bip21-summary"]').text()).toContain('For lunch Tuesday')
    wrapper.unmount()
  })

  it('routes selected BIP21 lightning payments to the send page', async () => {
    wrapper = createWrapper()
    await emitDetected(
      'bitcoin:bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080?amount=0.00021&lightning=lnbc210u',
    )

    await wrapper.get('[data-testid="scan-bip21-lightning-card"]').trigger('click')
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
    await emitDetected(target)

    await wrapper.get('[data-testid="scan-bip21-onchain-card"]').trigger('click')
    await flushPromises()

    expect(mockRouterPush).toHaveBeenCalledWith({
      path: '/send-onchain',
      query: { target },
    })
    wrapper.unmount()
  })

  it('routes raw bitcoin address scans to the onchain send page without lowercasing', async () => {
    wrapper = createWrapper()
    await emitDetected('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy')

    expect(mockRouterPush).toHaveBeenCalledWith({
      path: '/send-onchain',
      query: { target: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy' },
    })
    wrapper.unmount()
  })
})
