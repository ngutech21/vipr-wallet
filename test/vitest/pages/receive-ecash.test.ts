/* eslint-disable vue/one-component-per-file */
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import ReceiveEcashPage from 'src/pages/receive-ecash.vue'
import { useWalletStore, type EcashInspection } from 'src/stores/wallet'
import { useFederationStore } from 'src/stores/federation'
import type { Federation } from 'src/components/models'

const mockRouterPush = vi.hoisted(() => vi.fn())
const mockNotify = vi.hoisted(() => vi.fn())
const mockLoadingShow = vi.hoisted(() => vi.fn())
const mockLoadingHide = vi.hoisted(() => vi.fn())
const routeState = vi.hoisted(() => ({
  query: {} as Record<string, string>,
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

const qDialogStub = defineComponent({
  name: 'QDialog',
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },
  template: '<div><slot v-if="modelValue" /></div>',
})

const addFederationStub = defineComponent({
  name: 'AddFederation',
  emits: ['close'],
  template:
    '<div data-testid="add-federation-stub"><button data-testid="add-federation-close" @click="$emit(\'close\')" /></div>',
})

const federation: Federation = {
  title: 'Known Federation',
  inviteCode: 'fed11known',
  federationId: 'fed-1',
  guardians: [{ peerId: 0, name: 'Guardian', url: 'https://guardian.example' }],
  modules: [],
  metadata: {},
}

function createInspection(overrides: Partial<EcashInspection> = {}): EcashInspection {
  return {
    amountMsats: 12_000,
    amountSats: 12,
    parsed: {
      total_amount: 12_000,
      federation_id_prefix: 'fed-',
      federation_id: 'fed-1',
      invite_code: null,
      note_counts: { '1000': 12 },
    },
    matchedFederation: federation,
    inviteCode: null,
    requiresJoin: false,
    ...overrides,
  }
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
          'q-btn': qBtnStub,
          'q-input': passthrough,
          'q-dialog': qDialogStub,
          'q-avatar': passthrough,
          'q-img': passthrough,
          'q-icon': passthrough,
          'q-spinner-dots': passthrough,
          AddFederation: addFederationStub,
          FederationGuardians: defineComponent({
            template: '<div data-testid="guardians-stub" />',
          }),
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

  async function inspectToken() {
    await (
      wrapper.vm as unknown as { inspectEcashToken: (showLoading?: boolean) => Promise<void> }
    ).inspectEcashToken(false)
  }

  async function importToken() {
    await (wrapper.vm as unknown as { importEcash: () => Promise<void> }).importEcash()
  }

  it('previews the import amount and imports known federation ecash only after confirmation', async () => {
    wrapper = createWrapper()
    const walletStore = useWalletStore()
    const federationStore = useFederationStore()

    vi.spyOn(walletStore, 'inspectEcash').mockResolvedValue(createInspection())
    const redeemEcashSpy = vi.spyOn(walletStore, 'redeemEcash').mockResolvedValue()
    const selectFederationSpy = vi.spyOn(federationStore, 'selectFederation').mockResolvedValue()
    setEcashToken('notes-1')
    await inspectToken()
    await flushPromises()

    expect(wrapper.text()).toContain('12 sats')
    expect(wrapper.find('[data-testid="receive-ecash-import-btn"]').exists()).toBe(true)

    await importToken()

    expect(selectFederationSpy).toHaveBeenCalledWith(federation)
    expect(redeemEcashSpy).toHaveBeenCalledWith('notes-1')
    expect(mockRouterPush).toHaveBeenCalledWith({
      name: '/received-lightning',
      query: { amount: '12' },
    })

    wrapper.unmount()
  })

  it('opens federation preview for joinable unknown ecash and returns to import preview after join', async () => {
    wrapper = createWrapper()
    const walletStore = useWalletStore()

    vi.spyOn(walletStore, 'inspectEcash')
      .mockResolvedValueOnce(
        createInspection({
          matchedFederation: null,
          inviteCode: 'fed11join',
          requiresJoin: true,
        }),
      )
      .mockResolvedValueOnce(createInspection())
    setEcashToken('notes-join')
    await inspectToken()
    await flushPromises()

    expect(wrapper.find('[data-testid="receive-ecash-join-btn"]').exists()).toBe(true)

    await wrapper.get('[data-testid="receive-ecash-join-btn"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="add-federation-stub"]').exists()).toBe(true)

    await wrapper.get('[data-testid="add-federation-close"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="receive-ecash-import-btn"]').exists()).toBe(true)
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'positive',
      }),
    )

    wrapper.unmount()
  })

  it('shows a clean error when oob parsing fails', async () => {
    wrapper = createWrapper()
    const walletStore = useWalletStore()

    vi.spyOn(walletStore, 'inspectEcash').mockRejectedValue(new Error('invalid notes'))
    setEcashToken('bad-notes')
    await inspectToken()
    await flushPromises()

    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'negative',
        message: 'Failed to inspect eCash: invalid notes',
      }),
    )

    wrapper.unmount()
  })
})
