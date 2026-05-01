import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ReceiveOnchainPage from 'src/pages/receive-onchain.vue'

const mockRouterPush = vi.hoisted(() => vi.fn())
const mockUpdateBalance = vi.hoisted(() => vi.fn())
const federationStoreState = vi.hoisted(
  (): { selectedFederation: { federationId: string } | undefined } => ({
    selectedFederation: { federationId: 'fed-1' },
  }),
)

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}))

vi.mock('src/stores/federation', () => ({
  useFederationStore: () => ({
    get selectedFederation() {
      return federationStoreState.selectedFederation
    },
  }),
}))

vi.mock('src/stores/wallet', () => ({
  useWalletStore: () => ({
    wallet: {
      wallet: {
        generateAddress: vi.fn(),
      },
      federation: {
        getOperation: vi.fn(),
      },
    },
    updateBalance: mockUpdateBalance,
  }),
}))

vi.mock('src/composables/useAppNotify', () => ({
  useAppNotify: () => ({
    error: vi.fn(),
    success: vi.fn(),
  }),
}))

vi.mock('@vueuse/core', () => ({
  useShare: () => ({
    share: vi.fn(),
    isSupported: false,
  }),
}))

const SlotStub = {
  template: '<div><slot /></div>',
}

describe('ReceiveOnchainPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateBalance.mockResolvedValue(undefined)
    mockRouterPush.mockResolvedValue(undefined)
    federationStoreState.selectedFederation = { federationId: 'fed-1' }
  })

  it('navigates to the onchain success route when a deposit completes', async () => {
    const wrapper = mount(ReceiveOnchainPage, {
      global: {
        stubs: {
          transition: false,
          CopyableQrCard: true,
          FederationSelector: true,
          ViprTopbar: true,
          'q-page': SlotStub,
          'q-btn': SlotStub,
          'q-spinner': SlotStub,
        },
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wrapper.vm as any).completeDeposit(21_000)
    await flushPromises()

    expect(mockUpdateBalance).toHaveBeenCalledTimes(1)
    expect(mockRouterPush).toHaveBeenCalledWith({
      name: '/received-onchain',
      query: { amount: '21000' },
    })
  })
})
