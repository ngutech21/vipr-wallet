import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import SendPage from 'src/pages/send.vue'

const mockRouterPush = vi.hoisted(() => vi.fn())
const mockDecodeInvoiceFromComposable = vi.hoisted(() => vi.fn())
const mockCreateInvoiceFromInput = vi.hoisted(() => vi.fn())
const mockClearDecodedInvoice = vi.hoisted(() => vi.fn())
const mockPayInvoiceFromComposable = vi.hoisted(() => vi.fn())
const mockUseRoute = vi.hoisted(() => vi.fn())
const mockNotifyError = vi.hoisted(() => vi.fn())
const walletStoreState = vi.hoisted(() => ({
  balance: 500_000,
}))
const mockDecodedInvoiceRef = vi.hoisted(() => ({
  value: null as Record<string, unknown> | null,
  __v_isRef: true,
}))
const mockAmountRequiredRef = vi.hoisted(() => ({ value: false, __v_isRef: true }))
const mockLnAddressRef = vi.hoisted(() => ({ value: '', __v_isRef: true }))
const mockLnurlPayLimitsRef = vi.hoisted(() => ({
  value: null as { minSendableMsats: number; maxSendableMsats: number } | null,
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
    amountRequired: mockAmountRequiredRef,
    lnAddress: mockLnAddressRef,
    lnurlPayLimits: mockLnurlPayLimitsRef,
    decodedInvoice: mockDecodedInvoiceRef,
    decodeInvoice: mockDecodeInvoiceFromComposable,
    createInvoiceFromInput: mockCreateInvoiceFromInput,
    clearDecodedInvoice: mockClearDecodedInvoice,
  }),
}))

vi.mock('src/composables/useLightningPayment', () => ({
  useLightningPayment: () => ({
    payInvoice: mockPayInvoiceFromComposable,
  }),
}))

vi.mock('src/composables/useAppNotify', () => ({
  useAppNotify: () => ({
    error: mockNotifyError,
  }),
}))

vi.mock('src/stores/nostr', () => ({
  useNostrStore: () => mockNostrStore,
}))

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
  }),
}))

describe('SendPage query invoice handling', () => {
  type QueryInvoice = string | string[] | undefined
  type RouteState = {
    query: { invoice?: QueryInvoice; amount?: string; memo?: string; restoreDraft?: string }
  }

  let routeState: RouteState
  let wrapper: VueWrapper

  const QItemStub = {
    emits: ['click'],
    template: '<button v-bind="$attrs" type="button" @click="$emit(\'click\')"><slot /></button>',
  }

  const SlotStub = {
    template: '<div v-bind="$attrs"><slot /></div>',
  }

  const QBtnStub = {
    props: {
      disable: { type: Boolean, default: false },
      icon: { type: String, required: false, default: undefined },
      label: { type: String, required: false, default: undefined },
      loading: { type: Boolean, default: false },
    },
    emits: ['click'],
    template:
      '<button v-bind="$attrs" type="button" :disabled="disable || loading" :icon="icon" :label="label" @click="$emit(\'click\')"><slot>{{ label }}</slot></button>',
  }

  const QInputStub = {
    props: {
      modelValue: { type: [String, Number], required: false, default: '' },
    },
    emits: ['update:modelValue'],
    template:
      '<input v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /><slot name="append" />',
  }

  const baseStubs = {
    transition: false,
    VerifyPayment: true,
    'q-page': SlotStub,
    'q-toolbar': SlotStub,
    'q-btn': QBtnStub,
    'q-toolbar-title': SlotStub,
    'q-card': SlotStub,
    'q-card-section': SlotStub,
    'q-input': QInputStub,
    'q-slide-transition': SlotStub,
    'q-spinner-dots': SlotStub,
    'q-spinner': SlotStub,
    'q-dialog': SlotStub,
    ModalCard: SlotStub,
    FederationAvatar: true,
    'q-list': SlotStub,
    'q-item': QItemStub,
    'q-item-section': SlotStub,
    'q-item-label': SlotStub,
    'q-icon': SlotStub,
    'q-avatar': SlotStub,
  }

  function createWrapper(stubs: Record<string, unknown> = {}) {
    return mount(SendPage, {
      global: {
        stubs: {
          ...baseStubs,
          ...stubs,
        },
      },
    })
  }

  async function enterAmount(amount: string) {
    await amount.split('').reduce(async (previousDigit, digit) => {
      await previousDigit
      await wrapper.get(`[data-testid="receive-keypad-btn-${digit}"]`).trigger('click')
    }, Promise.resolve())
    await flushPromises()
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
    mockClearDecodedInvoice.mockImplementation(() => {
      mockDecodedInvoiceRef.value = null
    })
    mockPayInvoiceFromComposable.mockResolvedValue({ type: 'success', amountSats: 1, fee: 0 })
    mockDecodedInvoiceRef.value = null
    mockAmountRequiredRef.value = false
    mockLnAddressRef.value = ''
    mockLnurlPayLimitsRef.value = null
    walletStoreState.balance = 500_000
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

  it('does not show a contacts empty state before a contact query is entered', async () => {
    wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).not.toContain('No Contacts')
    expect(wrapper.find('[data-testid="send-no-contacts"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('does not show a contacts hint before a contact query is entered', async () => {
    mockNostrStore.contacts = [
      {
        pubkey: 'a'.repeat(64),
        npub: 'npub1example',
        paymentTarget: 'alice@getalby.com',
        displayName: 'Alice',
        lud16: 'alice@getalby.com',
      },
    ]

    wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-testid="send-contacts-hint"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="send-no-contact-matches"]').exists()).toBe(false)
    expect(mockNostrStore.getSuggestedContacts).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('shows filtered contact suggestions and decodes the selected contact target', async () => {
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

    await wrapper.get('[data-testid="send-invoice-input"]').setValue('ali')
    await flushPromises()

    expect(wrapper.text()).toContain('Alice')
    await wrapper
      .find(
        '[data-testid="send-contact-item-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]',
      )
      .trigger('click')

    expect(mockNostrStore.getSuggestedContacts).toHaveBeenCalledWith('ali')
    expect(mockDecodeInvoiceFromComposable).toHaveBeenCalledWith('alice@getalby.com')
    wrapper.unmount()
  })

  it('uses the keypad amount when creating an invoice for lightning addresses', async () => {
    mockAmountRequiredRef.value = true

    wrapper = createWrapper()
    await flushPromises()
    await enterAmount('42')

    expect(wrapper.text()).toContain('Review the payment details before sending.')
    expect(wrapper.get('[data-testid="send-continue-btn"]').attributes('label')).toBe(
      'Review payment',
    )
    expect(wrapper.get('[data-testid="send-continue-btn"]').attributes('icon')).toBe('bolt')

    await wrapper.get('[data-testid="send-continue-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="send-amount-input"]').exists()).toBe(true)
    expect(mockCreateInvoiceFromInput).toHaveBeenCalledWith('', 42, '')
    wrapper.unmount()
  })

  it('returns from payment verification to the send input before leaving the flow', async () => {
    mockDecodedInvoiceRef.value = {
      invoice: 'lnbc1decodedinvoice',
      amount: 123,
      description: 'test',
      paymentHash: 'hash',
      timestamp: 0,
      expiry: 60,
    }

    wrapper = createWrapper()
    await flushPromises()

    await wrapper.get('[data-testid="send-back-btn"]').trigger('click')
    await flushPromises()

    expect(mockDecodedInvoiceRef.value).toBe(null)
    expect(mockRouterPush).not.toHaveBeenCalledWith({ name: '/' })
    wrapper.unmount()
  })

  it('passes the send draft to the scanner return context', async () => {
    mockAmountRequiredRef.value = true
    mockLnAddressRef.value = 'alice@example.com'

    wrapper = createWrapper()
    await flushPromises()

    await wrapper.get('[data-testid="send-invoice-input"]').setValue('alice@example.com')
    await enterAmount('42')
    await wrapper.get('[data-testid="send-memo-input"]').setValue('Dinner')
    await wrapper.get('[data-testid="send-open-scanner-btn"]').trigger('click')

    expect(mockRouterPush).toHaveBeenCalledWith({
      name: '/scan',
      query: {
        returnTo: 'send',
        invoice: 'alice@example.com',
        amount: '42',
        memo: 'Dinner',
      },
    })
    wrapper.unmount()
  })

  it('restores send amount and memo from scanner return query', async () => {
    routeState.query.invoice = 'alice@example.com'
    routeState.query.amount = '42'
    routeState.query.memo = 'Dinner'
    mockAmountRequiredRef.value = true
    mockLnAddressRef.value = 'alice@example.com'

    wrapper = createWrapper()
    await flushPromises()

    expect(mockDecodeInvoiceFromComposable).toHaveBeenCalledWith('alice@example.com')
    expect(wrapper.get('[data-testid="send-amount-input"]').text()).toContain('42')
    expect((wrapper.get('[data-testid="send-memo-input"]').element as HTMLInputElement).value).toBe(
      'Dinner',
    )
    wrapper.unmount()
  })

  it('does not decode a pasted invoice when returning from scanner to a send draft', async () => {
    routeState.query.invoice = 'lnbc1pastedinvoice'
    routeState.query.restoreDraft = '1'

    wrapper = createWrapper()
    await flushPromises()

    expect(mockDecodeInvoiceFromComposable).not.toHaveBeenCalled()
    expect(
      (wrapper.get('[data-testid="send-invoice-input"]').element as HTMLInputElement).value,
    ).toBe('lnbc1pastedinvoice')
    wrapper.unmount()
  })

  it('blocks lightning address invoice creation above the active federation balance', async () => {
    mockAmountRequiredRef.value = true
    walletStoreState.balance = 500_000

    wrapper = createWrapper()
    await flushPromises()
    await enterAmount('501000')
    await flushPromises()

    expect(wrapper.text()).toContain('Amount must be 500,000 sats or less')
    expect(mockCreateInvoiceFromInput).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('shows a compact LNURL amount limit hint', async () => {
    mockAmountRequiredRef.value = true
    mockLnurlPayLimitsRef.value = {
      minSendableMsats: 10_000,
      maxSendableMsats: 39_000,
    }

    wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.get('[data-testid="send-lnurl-limit-hint"]').text()).toBe('Limit: 10 - 39 sats')
    wrapper.unmount()
  })

  it('blocks LNURL invoice creation below the advertised minimum amount', async () => {
    mockAmountRequiredRef.value = true
    mockLnurlPayLimitsRef.value = {
      minSendableMsats: 10_000,
      maxSendableMsats: 39_000,
    }

    wrapper = createWrapper()
    await flushPromises()
    await enterAmount('9')
    await flushPromises()

    expect(wrapper.text()).toContain('Amount must be at least 10 sats')
    expect(mockCreateInvoiceFromInput).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('blocks LNURL invoice creation above the advertised maximum amount', async () => {
    mockAmountRequiredRef.value = true
    mockLnurlPayLimitsRef.value = {
      minSendableMsats: 10_000,
      maxSendableMsats: 39_000,
    }

    wrapper = createWrapper()
    await flushPromises()
    await enterAmount('40')
    await flushPromises()

    expect(wrapper.text()).toContain('Amount must be 39 sats or less')
    expect(mockCreateInvoiceFromInput).not.toHaveBeenCalled()
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
          ...baseStubs,
          VerifyPayment: {
            template: '<button data-testid="verify-pay" @click="$emit(\'pay\')">pay</button>',
          },
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

  it('blocks decoded bolt11 payments above the active federation balance', async () => {
    walletStoreState.balance = 500_000
    mockDecodedInvoiceRef.value = {
      invoice: 'lnbc1decodedinvoice',
      amount: 501_000,
      description: 'test',
      paymentHash: 'hash',
      timestamp: 0,
      expiry: 60,
    }

    wrapper = mount(SendPage, {
      global: {
        stubs: {
          ...baseStubs,
          VerifyPayment: {
            props: ['balanceErrorMessage'],
            template:
              '<div><div data-testid="balance-error">{{ balanceErrorMessage }}</div><button data-testid="verify-pay" @click="$emit(\'pay\')">pay</button></div>',
          },
        },
      },
    })

    expect(wrapper.get('[data-testid="balance-error"]').text()).toContain(
      'Insufficient balance. Available: 500,000 sats',
    )

    await wrapper.find('[data-testid="verify-pay"]').trigger('click')
    await flushPromises()

    expect(mockPayInvoiceFromComposable).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
