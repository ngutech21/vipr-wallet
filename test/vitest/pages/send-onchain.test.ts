import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { reactive } from 'vue'
import SendOnchainPage from 'src/pages/send-onchain.vue'
import { MIN_ONCHAIN_SEND_SATS, ONCHAIN_FEE_RESERVE_SATS } from 'src/utils/onchainPolicy'

const mockRouterPush = vi.hoisted(() => vi.fn())
const mockUseRoute = vi.hoisted(() => vi.fn())
const mockSendOnchain = vi.hoisted(() => vi.fn())
const mockLoadingShow = vi.hoisted(() => vi.fn())
const mockLoadingHide = vi.hoisted(() => vi.fn())
const mockNotify = vi.hoisted(() => vi.fn())
const amountRef = vi.hoisted(() => ({ value: 0, __v_isRef: true }))
const walletStoreState = vi.hoisted(() => ({
  balance: 500_000,
}))
const mockSetValue = vi.hoisted(() =>
  vi.fn((nextValue: number) => {
    amountRef.value = nextValue
  }),
)

const qBtnStub = {
  emits: ['click'],
  template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
}

const qInputStub = {
  props: {
    modelValue: {
      type: [String, Number],
      default: '',
    },
    errorMessage: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue'],
  template:
    '<div><textarea v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"></textarea><div v-if="errorMessage">{{ errorMessage }}</div></div>',
}

vi.mock('vue-router', () => ({
  useRoute: (...args: unknown[]) => mockUseRoute(...args),
  useRouter: () => ({
    push: mockRouterPush,
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

vi.mock('src/stores/federation', () => ({
  useFederationStore: () => ({
    federations: [{ federationId: 'fed-1', title: 'Fed 1', inviteCode: 'fed11test', modules: [] }],
    selectedFederation: { federationId: 'fed-1', title: 'Fed 1' },
    selectFederation: vi.fn(),
  }),
}))

vi.mock('src/stores/wallet', () => ({
  useWalletStore: () => ({
    balance: walletStoreState.balance,
    sendOnchain: mockSendOnchain,
  }),
}))

vi.mock('src/composables/useNumericInput', () => ({
  useNumericInput: () => ({
    value: amountRef,
    keypadButtons: [],
    setValue: mockSetValue,
  }),
}))

describe('SendOnchainPage', () => {
  type RouteState = { query: { target?: string | string[] } }

  let routeState: RouteState
  let wrapper: VueWrapper

  function createWrapper() {
    return mount(SendOnchainPage, {
      global: {
        stubs: {
          transition: false,
          NumericKeypad: true,
          'q-page': {
            template: '<div><slot /></div>',
          },
          'q-toolbar': {
            template: '<div><slot /></div>',
          },
          'q-toolbar-title': {
            template: '<div><slot /></div>',
          },
          'q-card': {
            template: '<div><slot /></div>',
          },
          'q-card-section': {
            template: '<div><slot /></div>',
          },
          'q-spinner-dots': true,
          'q-spinner': true,
          'q-dialog': {
            template: '<div><slot /></div>',
          },
          ModalCard: {
            template: '<div><slot /></div>',
          },
          FederationAvatar: true,
          'q-img': true,
          'q-icon': {
            template: '<span><slot /></span>',
          },
          'q-btn': qBtnStub,
          'q-input': qInputStub,
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    routeState = reactive<RouteState>({
      query: {},
    })
    walletStoreState.balance = 500_000
    amountRef.value = 0
    mockUseRoute.mockImplementation(() => routeState)
    mockSendOnchain.mockResolvedValue({ operationId: 'withdraw-op-1' })
    mockRouterPush.mockResolvedValue(undefined)
  })

  it('prefills the amount from a bitcoin URI query parameter', async () => {
    routeState.query.target =
      'bitcoin:bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080?amount=0.00021&label=Vipr'

    wrapper = createWrapper()
    await flushPromises()

    expect(mockSetValue).toHaveBeenCalledWith(21_000)
    expect(amountRef.value).toBe(21_000)
    wrapper.unmount()
  })

  it('shows the max send amount after reserving fees', async () => {
    wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain(`Available: ${walletStoreState.balance.toLocaleString()} sats`)
    expect(wrapper.text()).toContain(
      `Maximum spendable now: ${(500_000 - ONCHAIN_FEE_RESERVE_SATS).toLocaleString()} sats`,
    )
    wrapper.unmount()
  })

  it('submits an onchain transfer and routes to the pending screen', async () => {
    routeState.query.target = '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy'
    amountRef.value = 21_000

    wrapper = createWrapper()
    await flushPromises()
    await wrapper.get('[data-testid="send-onchain-submit-btn"]').trigger('click')
    await flushPromises()

    expect(mockSendOnchain).toHaveBeenCalledWith('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy', 21_000, {
      requestedAmountSats: 21_000,
      requestedAmountMsats: 21_000_000,
    })
    expect(mockRouterPush).toHaveBeenCalledWith({
      path: '/sent-onchain',
      query: {
        operationId: 'withdraw-op-1',
        address: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
        amount: '21000',
      },
    })
    expect(mockLoadingShow).toHaveBeenCalledWith({
      message: 'Submitting on-chain transfer...',
    })
    expect(mockLoadingHide).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('does not submit amounts below the configured onchain minimum', async () => {
    routeState.query.target = '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy'
    amountRef.value = MIN_ONCHAIN_SEND_SATS - 1

    wrapper = createWrapper()
    await flushPromises()
    await wrapper.get('[data-testid="send-onchain-submit-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain(
      `Amount must be at least ${MIN_ONCHAIN_SEND_SATS.toLocaleString()} sats`,
    )
    expect(mockSendOnchain).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
