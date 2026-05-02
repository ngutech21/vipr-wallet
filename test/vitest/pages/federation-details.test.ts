import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { Quasar } from 'quasar'
import FederationDetailsPage from 'src/pages/federation/[id].vue'
import type { Federation } from 'src/types/federation'

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

describe('FederationDetailsPage', () => {
  beforeEach(() => {
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
    walletStoreState.openWallet.mockResolvedValue(undefined)
    selectFederation.mockResolvedValue(undefined)
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
          'q-page': { template: '<div><slot /></div>' },
          'q-card': { template: '<div><slot /></div>' },
          'q-card-section': { template: '<div><slot /></div>' },
          'q-card-actions': { template: '<div><slot /></div>' },
          'q-btn': { template: '<button v-bind="$attrs"><slot /></button>' },
          'q-avatar': { template: '<div><slot /></div>' },
          'q-img': true,
          'q-icon': { template: '<span><slot /></span>' },
          'q-chip': { template: '<span><slot /></span>' },
          'q-separator': true,
          'q-dialog': { template: '<div><slot /></div>' },
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

    expect(updateGatewayCache).toHaveBeenCalledTimes(1)
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
    expect(updateGatewayCache).toHaveBeenCalledTimes(1)
    expect(listGateways).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).not.toContain('Wallet is not open.')

    wrapper.unmount()
  })

  it('shows meta consensus loading state while debug metadata is loading', async () => {
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
    getMetaConsensusValue.mockRejectedValue(new Error('Meta module unavailable'))

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('Consensus Metadata')
    expect(wrapper.text()).toContain('Failed to load consensus metadata.')

    wrapper.unmount()
  })
})
