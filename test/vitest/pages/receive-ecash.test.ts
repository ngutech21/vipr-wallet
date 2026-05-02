/* eslint-disable vue/one-component-per-file */
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import ReceiveEcashPage from 'src/pages/receive-ecash.vue'
import { useFederationStore } from 'src/stores/federation'
import { useWalletStore, type EcashInspection } from 'src/stores/wallet'
import type { Federation } from 'src/types/federation'

type RouteState = {
  query: Record<string, string>
}

const mockRouterPush = vi.hoisted(() => vi.fn())
const mockNotify = vi.hoisted(() => vi.fn())
const mockLoadingShow = vi.hoisted(() => vi.fn())
const mockLoadingHide = vi.hoisted(() => vi.fn())
const routeState: RouteState = vi.hoisted(() => ({
  query: {},
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
  useRoute: () => routeState,
}))

vi.mock('quasar', async (importOriginal) => {
  const actual = await importOriginal()
  return Object.assign({}, actual, {
    useQuasar: () => ({
      notify: mockNotify,
    }),
    Loading: {
      show: mockLoadingShow,
      hide: mockLoadingHide,
    },
  })
})

const passthrough = defineComponent({
  template: '<div><slot /></div>',
})

const qBtnStub = defineComponent({
  name: 'QBtn',
  props: {
    label: {
      type: String,
      default: '',
    },
  },
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}<slot /></button>',
})

const modalCardStub = defineComponent({
  name: 'ModalCard',
  emits: ['close'],
  template: '<div data-testid="modal-card-stub"><slot /><slot name="footer" /></div>',
})

const joinFederationPreviewStepStub = defineComponent({
  name: 'JoinFederationPreviewStep',
  props: {
    federation: {
      type: Object,
      required: true,
    },
    importAmountSats: {
      type: Number,
      default: null,
    },
  },
  template:
    '<div data-testid="join-federation-preview-step" :data-import-amount-sats="importAmountSats">{{ federation.title }}</div>',
})

const federationAvatarStub = defineComponent({
  name: 'FederationAvatar',
  props: {
    federation: {
      type: Object,
      default: null,
    },
  },
  template: '<div data-testid="federation-avatar-stub" />',
})

const joinedFederation: Federation = {
  federationId: 'fed-1',
  title: 'Joined Federation',
  inviteCode: 'fed11joined',
  modules: [],
}

const newFederation: Federation = {
  federationId: 'fed-2',
  title: 'New Federation',
  inviteCode: 'fed12new',
  modules: [],
}

describe('ReceiveEcashPage', () => {
  let wrapper: VueWrapper

  function createWrapper() {
    const pinia = createPinia()
    setActivePinia(pinia)

    return mount(ReceiveEcashPage, {
      global: {
        plugins: [pinia],
        stubs: {
          'q-page': passthrough,
          'q-toolbar': passthrough,
          'q-toolbar-title': passthrough,
          'q-card': passthrough,
          'q-card-section': passthrough,
          'q-dialog': passthrough,
          'q-icon': passthrough,
          'q-btn': qBtnStub,
          'q-input': passthrough,
          'q-spinner': passthrough,
          'q-spinner-dots': passthrough,
          FederationAvatar: federationAvatarStub,
          ModalCard: modalCardStub,
          JoinFederationPreviewStep: joinFederationPreviewStepStub,
        },
      },
    })
  }

  beforeEach(() => {
    routeState.query = {}
    vi.clearAllMocks()
    mockRouterPush.mockResolvedValue(undefined)
  })

  function setEcashToken(value: string) {
    ;(wrapper.vm as unknown as { ecashToken: string }).ecashToken = value
  }

  async function redeemEcash() {
    await (wrapper.vm as unknown as { redeemEcash: () => Promise<void> }).redeemEcash()
  }

  async function pasteFromClipboard() {
    await (
      wrapper.vm as unknown as { pasteFromClipboard: () => Promise<void> }
    ).pasteFromClipboard()
  }

  function mockClipboardText(value: string) {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        readText: vi.fn().mockResolvedValue(value),
      },
    })
  }

  function createInspection(overrides: Partial<EcashInspection> = {}): EcashInspection {
    return {
      amountMsats: 12_000,
      amountSats: 12,
      parsed: {
        total_amount: 12_000,
        federation_id_prefix: 'fed1',
        federation_id: joinedFederation.federationId,
        invite_code: joinedFederation.inviteCode,
        note_counts: { '1000': 12 },
      },
      matchedFederation: joinedFederation,
      inviteCode: joinedFederation.inviteCode,
      requiresJoin: false,
      ...overrides,
    }
  }

  function joinFederationInStore(federation: Federation = joinedFederation) {
    const federationStore = useFederationStore()
    federationStore.federations = [federation]
    federationStore.selectedFederationId = federation.federationId
  }

  it('prefills token from route query when provided', async () => {
    routeState.query = { token: 'cashuAquery' }
    wrapper = createWrapper()
    await flushPromises()

    expect((wrapper.vm as unknown as { ecashToken: string }).ecashToken).toBe('cashuAquery')
    wrapper.unmount()
  })

  it('keeps a federation-sized placeholder before ecash is inspected', async () => {
    wrapper = createWrapper()
    await flushPromises()

    expect(
      wrapper
        .get('[data-testid="receive-ecash-token-preview"] .receive-ecash-token-preview__card')
        .classes(),
    ).toContain('receive-ecash-token-preview__card--placeholder')
    expect(wrapper.text()).toContain('Paste or scan ecash to detect its federation.')
    wrapper.unmount()
  })

  it('previews the issuing federation and amount after pasting joined federation ecash', async () => {
    wrapper = createWrapper()
    const walletStore = useWalletStore()
    joinFederationInStore()

    vi.spyOn(walletStore, 'inspectEcash').mockResolvedValue(createInspection())
    mockClipboardText('notes-1')

    await pasteFromClipboard()
    await flushPromises()

    expect(wrapper.get('[data-testid="receive-ecash-token-preview"]').text()).toContain(
      'Joined Federation',
    )
    expect(wrapper.get('[data-testid="receive-ecash-token-preview"]').text()).toContain(
      'Detected federation',
    )
    expect(wrapper.get('[data-testid="receive-ecash-preview-amount"]').text()).toContain('12 sats')
    expect(wrapper.text()).toContain('Redeems ecash into its issuing federation.')
    wrapper.unmount()
  })

  it('previews join-required federation ecash without making it selectable', async () => {
    wrapper = createWrapper()
    const walletStore = useWalletStore()

    vi.spyOn(walletStore, 'inspectEcash').mockResolvedValue(
      createInspection({
        parsed: {
          total_amount: 21_000,
          federation_id_prefix: 'fed2',
          federation_id: newFederation.federationId,
          invite_code: newFederation.inviteCode,
          note_counts: { '1000': 21 },
        },
        amountMsats: 21_000,
        amountSats: 21,
        matchedFederation: null,
        inviteCode: newFederation.inviteCode,
        requiresJoin: true,
      }),
    )
    vi.spyOn(walletStore, 'previewFederation').mockResolvedValue(newFederation)
    mockClipboardText('new-fed-notes')

    await pasteFromClipboard()
    await flushPromises()

    expect(wrapper.get('[data-testid="receive-ecash-token-preview"]').text()).toContain(
      'New Federation',
    )
    expect(wrapper.get('[data-testid="receive-ecash-token-preview"]').text()).toContain(
      'Join required',
    )
    expect(wrapper.get('[data-testid="receive-ecash-preview-amount"]').text()).toContain('21 sats')
    expect(wrapper.text()).toContain('requires joining its federation')
    wrapper.unmount()
  })

  it('redeems ecash and navigates with the redeemed amount', async () => {
    wrapper = createWrapper()
    const walletStore = useWalletStore()
    joinFederationInStore()

    vi.spyOn(walletStore, 'inspectEcash').mockResolvedValue(createInspection())
    const redeemEcashSpy = vi.spyOn(walletStore, 'redeemEcash').mockResolvedValue(12_000)
    setEcashToken('notes-1')

    await redeemEcash()

    expect(redeemEcashSpy).toHaveBeenCalledWith('notes-1')
    expect(mockRouterPush).toHaveBeenCalledWith({
      name: '/received-lightning',
      query: { amount: 12 },
    })
    wrapper.unmount()
  })

  it('does not navigate when redeem returns zero amount', async () => {
    wrapper = createWrapper()
    const walletStore = useWalletStore()
    joinFederationInStore()

    vi.spyOn(walletStore, 'inspectEcash').mockResolvedValue(createInspection())
    vi.spyOn(walletStore, 'redeemEcash').mockResolvedValue(0)
    setEcashToken('notes-1')

    await redeemEcash()

    expect(mockRouterPush).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('shows a clean error when redeem fails', async () => {
    wrapper = createWrapper()
    const walletStore = useWalletStore()
    joinFederationInStore()

    vi.spyOn(walletStore, 'inspectEcash').mockResolvedValue(createInspection())
    vi.spyOn(walletStore, 'redeemEcash').mockRejectedValue(new Error('invalid notes'))
    setEcashToken('bad-notes')

    await redeemEcash()
    await flushPromises()

    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'negative',
        message: 'Failed to redeem ecash: invalid notes',
      }),
    )

    wrapper.unmount()
  })

  it('warns when the current SDK cannot inspect unknown federation ecash', async () => {
    wrapper = createWrapper()
    const walletStore = useWalletStore()

    vi.spyOn(walletStore, 'inspectEcash').mockRejectedValue(
      new TypeError('this.director.parseOobNotes is not a function'),
    )
    const redeemEcashSpy = vi.spyOn(walletStore, 'redeemEcash').mockResolvedValue(12_000)
    setEcashToken('unknown-fed-notes')

    await redeemEcash()
    await flushPromises()

    expect(redeemEcashSpy).not.toHaveBeenCalled()
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        color: 'warning',
        message:
          'Ecash from federations you have not joined yet cannot be imported with the current Fedimint SDK. Join the federation first, then try again.',
      }),
    )

    wrapper.unmount()
  })

  it('prompts to join the notes federation before redeeming ecash from a new federation', async () => {
    wrapper = createWrapper()
    const walletStore = useWalletStore()
    const federationStore = useFederationStore()

    vi.spyOn(walletStore, 'inspectEcash').mockResolvedValue(
      createInspection({
        parsed: {
          total_amount: 21_000,
          federation_id_prefix: 'fed2',
          federation_id: newFederation.federationId,
          invite_code: newFederation.inviteCode,
          note_counts: { '1000': 21 },
        },
        amountMsats: 21_000,
        amountSats: 21,
        matchedFederation: null,
        inviteCode: newFederation.inviteCode,
        requiresJoin: true,
      }),
    )
    vi.spyOn(walletStore, 'previewFederation').mockResolvedValue(newFederation)
    const redeemEcashSpy = vi.spyOn(walletStore, 'redeemEcash').mockResolvedValue(21_000)
    const selectFederationSpy = vi
      .spyOn(federationStore, 'selectFederation')
      .mockImplementation((federation) => {
        federationStore.selectedFederationId = federation?.federationId ?? null
        return Promise.resolve()
      })

    setEcashToken('new-fed-notes')

    await redeemEcash()
    await flushPromises()

    expect(wrapper.get('[data-testid="join-federation-preview-step"]').attributes()).toMatchObject({
      'data-import-amount-sats': '21',
    })
    expect(redeemEcashSpy).not.toHaveBeenCalled()

    await (
      wrapper.vm as unknown as { joinFederationAndRedeem: () => Promise<void> }
    ).joinFederationAndRedeem()
    await flushPromises()

    expect(federationStore.federations).toContainEqual({
      ...newFederation,
      metadata: {},
    })
    expect(selectFederationSpy).toHaveBeenCalledWith(newFederation)
    expect(redeemEcashSpy).toHaveBeenCalledWith('new-fed-notes')
    expect(mockRouterPush).toHaveBeenCalledWith({
      name: '/received-lightning',
      query: { amount: 21 },
    })
    wrapper.unmount()
  })
})
