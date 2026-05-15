import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { Quasar } from 'quasar'
import FederationDetailsPage from 'src/pages/federation/[id].vue'
import type { Federation } from 'src/types/federation'
import { PassthroughStub, QBtnStub } from '../mocks/quasar-stubs'

const mockRouterPush = vi.hoisted(() => vi.fn())
const routeState = vi.hoisted(() => ({
  params: {
    id: 'fed-1',
  },
}))
const updateGatewayCache = vi.hoisted(() => vi.fn())
const listGateways = vi.hoisted(() => vi.fn())
const getSpendableUtxos = vi.hoisted(() => vi.fn())
const getMetaConsensusValue = vi.hoisted(() => vi.fn())
const selectFederation = vi.hoisted(() => vi.fn())

const federationStoreState = vi.hoisted(() => ({
  selectedFederationId: 'fed-1',
  federations: [] as Federation[],
  selectFederation,
  deleteFederation: vi.fn(),
}))

const walletStoreState = vi.hoisted(() => ({
  activeWalletName: 'wallet-fed-1',
  wallet: {
    lightning: {
      updateGatewayCache,
      listGateways,
    },
  },
  getSpendableUtxos,
  getMetaConsensusValue,
  closeWallet: vi.fn(),
  deleteFederationData: vi.fn(),
  openWallet: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({
    push: mockRouterPush,
  }),
}))

vi.mock('@vueuse/core', () => ({
  useShare: () => ({
    share: vi.fn(),
    isSupported: false,
  }),
}))

vi.mock('src/stores/federation', () => ({
  useFederationStore: () => federationStoreState,
}))

vi.mock('src/stores/wallet', () => ({
  useWalletStore: () => walletStoreState,
  getWalletNameForFederationId: (federationId: string) => `wallet-${federationId}`,
}))

function createFederation(overrides: Partial<Federation> = {}): Federation {
  return {
    title: 'Test Federation',
    inviteCode: 'fed11test',
    federationId: 'fed-1',
    modules: [],
    metadata: {},
    ...overrides,
  }
}

function createMetaModule() {
  return {
    config: 'meta',
    kind: 'meta',
    version: {
      major: 0,
      minor: 0,
    },
  }
}

describe('FederationDetailsPage', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    routeState.params.id = 'fed-1'
    federationStoreState.selectedFederationId = 'fed-1'
    federationStoreState.federations = [createFederation()]
    walletStoreState.activeWalletName = 'wallet-fed-1'
    walletStoreState.wallet = {
      lightning: {
        updateGatewayCache,
        listGateways,
      },
    }
    walletStoreState.closeWallet.mockResolvedValue(undefined)
    walletStoreState.deleteFederationData.mockResolvedValue(undefined)
    walletStoreState.openWallet.mockResolvedValue(undefined)
    selectFederation.mockResolvedValue(undefined)
    federationStoreState.deleteFederation.mockReturnValue(undefined)
    getSpendableUtxos.mockResolvedValue([])
    getMetaConsensusValue.mockResolvedValue({
      revision: 1,
      value: {
        federation_name: 'Meta Federation',
      },
    })
    updateGatewayCache.mockResolvedValue(undefined)
    listGateways.mockResolvedValue([
      {
        info: {
          gateway_id: 'gateway-1',
          api: 'https://gateway.example.com/v1',
          lightning_alias: 'Fedi us-east-1 [fedi.xyz]',
          node_pub_key: '02dd3fcdaa17b9bc83bf7138fbea85d0e83385a68b5fc8f9933658c8ee04644f68',
          fees: {
            base_msat: 2000,
            proportional_millionths: 5000,
          },
        },
        vetted: true,
      },
    ])
  })

  function createWrapper() {
    return mount(FederationDetailsPage, {
      global: {
        plugins: [Quasar],
        stubs: {
          transition: false,
          FederationGuardians: true,
          FederationUtxos: true,
          CopyableQrCard: true,
          'q-page': PassthroughStub,
          'q-card': PassthroughStub,
          'q-card-section': PassthroughStub,
          'q-card-actions': PassthroughStub,
          'q-btn': QBtnStub,
          'q-avatar': PassthroughStub,
          'q-img': true,
          'q-icon': PassthroughStub,
          'q-chip': PassthroughStub,
          'q-separator': true,
          'q-dialog': {
            props: {
              modelValue: { type: Boolean, required: false, default: false },
            },
            template: '<div v-if="modelValue"><slot /></div>',
          },
          'q-list': { template: '<div><slot /></div>' },
          'q-item': { template: '<div><slot /></div>' },
          'q-item-section': { template: '<div><slot /></div>' },
          'q-item-label': { template: '<div><slot /></div>' },
          'q-tooltip': true,
        },
      },
    })
  }

  it('shows wallet gateways returned by wallet.lightning.listGateways', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    expect(updateGatewayCache).not.toHaveBeenCalled()
    expect(listGateways).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Gateways')
    expect(wrapper.text()).toContain('gateway-1')
    expect(wrapper.text()).toContain('Fedi us-east-1 [fedi.xyz]')
    expect(wrapper.text()).toContain('https://gateway.example.com/v1')
    expect(wrapper.text()).toContain(
      '02dd3fcdaa17b9bc83bf7138fbea85d0e83385a68b5fc8f9933658c8ee04644f68',
    )
    expect(wrapper.text()).toContain('Base fee')
    expect(wrapper.text()).toContain('Proportional')
    expect(wrapper.text()).toContain('2,000 msat')
    expect(wrapper.text()).toContain('5,000 ppm')
    expect(wrapper.html()).toContain(
      'https://amboss.space/node/02dd3fcdaa17b9bc83bf7138fbea85d0e83385a68b5fc8f9933658c8ee04644f68',
    )

    wrapper.unmount()
  })

  it('does not load meta consensus metadata when the federation has no meta module', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    expect(getMetaConsensusValue).not.toHaveBeenCalled()
    expect(wrapper.text()).not.toContain('Consensus Metadata')
    expect(wrapper.text()).not.toContain('Failed to load consensus metadata.')

    wrapper.unmount()
  })

  it('waits for the selected federation wallet to open before loading wallet-backed details', async () => {
    walletStoreState.activeWalletName = 'wallet-fed-1'
    federationStoreState.selectedFederationId = 'fed-2'
    routeState.params.id = 'fed-2'
    federationStoreState.federations = [
      createFederation(),
      createFederation({ federationId: 'fed-2', inviteCode: 'fed11second' }),
    ]

    walletStoreState.openWallet.mockImplementation(() => {
      walletStoreState.activeWalletName = 'wallet-fed-2'
      return Promise.resolve()
    })

    const wrapper = createWrapper()
    await flushPromises()

    expect(walletStoreState.openWallet).toHaveBeenCalledTimes(1)
    expect(getSpendableUtxos).toHaveBeenCalledTimes(1)
    expect(updateGatewayCache).not.toHaveBeenCalled()
    expect(listGateways).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).not.toContain('Wallet is not open.')

    wrapper.unmount()
  })

  it('shows meta consensus loading state while debug metadata is loading', async () => {
    federationStoreState.federations = [createFederation({ modules: [createMetaModule()] })]
    getMetaConsensusValue.mockReturnValue(
      new Promise(() => {
        // Keep the Meta module request pending so the loading UI remains visible.
      }),
    )

    const wrapper = createWrapper()
    await nextTick()

    expect(wrapper.text()).toContain('Consensus Metadata')
    expect(wrapper.text()).toContain('Loading metadata from the Meta module...')

    wrapper.unmount()
  })

  it('shows meta consensus failure state when debug metadata loading fails', async () => {
    federationStoreState.federations = [createFederation({ modules: [createMetaModule()] })]
    getMetaConsensusValue.mockRejectedValue(new Error('Meta module unavailable'))

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('Consensus Metadata')
    expect(wrapper.text()).toContain('Failed to load consensus metadata.')

    wrapper.unmount()
  })

  it('leaves a federation by closing the wallet, deleting local data, and returning to federations', async () => {
    vi.useFakeTimers()
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-testid="federation-details-leave-confirm-btn"]').exists()).toBe(
      false,
    )
    await wrapper.get('[data-testid="federation-details-leave-btn"]').trigger('click')
    expect(wrapper.find('[data-testid="federation-details-leave-confirm-btn"]').exists()).toBe(true)
    await wrapper.get('[data-testid="federation-details-leave-confirm-btn"]').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(100)
    await flushPromises()

    expect(walletStoreState.closeWallet).toHaveBeenCalledTimes(1)
    expect(walletStoreState.deleteFederationData).toHaveBeenCalledWith('fed-1')
    expect(federationStoreState.deleteFederation).toHaveBeenCalledWith('fed-1')
    expect(walletStoreState.openWallet).toHaveBeenCalledTimes(1)
    expect(mockRouterPush).toHaveBeenCalledWith({ name: '/federations/' })

    wrapper.unmount()
    vi.useRealTimers()
  })

  it('returns to federations without deleting the store entry when local federation data deletion fails', async () => {
    vi.useFakeTimers()
    walletStoreState.deleteFederationData.mockRejectedValue(new Error('delete failed'))
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-testid="federation-details-leave-confirm-btn"]').exists()).toBe(
      false,
    )
    await wrapper.get('[data-testid="federation-details-leave-btn"]').trigger('click')
    expect(wrapper.find('[data-testid="federation-details-leave-confirm-btn"]').exists()).toBe(true)
    await wrapper.get('[data-testid="federation-details-leave-confirm-btn"]').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(100)
    await flushPromises()

    expect(walletStoreState.closeWallet).toHaveBeenCalledTimes(1)
    expect(walletStoreState.deleteFederationData).toHaveBeenCalledWith('fed-1')
    expect(federationStoreState.deleteFederation).not.toHaveBeenCalled()
    expect(walletStoreState.openWallet).not.toHaveBeenCalled()
    expect(mockRouterPush).toHaveBeenCalledWith({ name: '/federations/' })

    wrapper.unmount()
    vi.useRealTimers()
  })
})
