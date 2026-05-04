import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ReceiveOnchainPage from 'src/pages/receive-onchain.vue'

const mockRouterPush = vi.hoisted(() => vi.fn())
const mockUpdateBalance = vi.hoisted(() => vi.fn())
const mockGenerateAddress = vi.hoisted(() => vi.fn())
const mockSubscribeDeposit = vi.hoisted(() => vi.fn())
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
        generateAddress: mockGenerateAddress,
        subscribeDeposit: mockSubscribeDeposit,
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
    mockGenerateAddress.mockResolvedValue({
      deposit_address: 'bcrt1qdepositaddress',
      operation_id: 'deposit-op-1',
    })
    mockSubscribeDeposit.mockReturnValue(vi.fn())
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

  it('subscribes to the deposit and navigates when the wallet reports confirmation', async () => {
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
    await (wrapper.vm as any).generateAddress()

    expect(mockSubscribeDeposit).toHaveBeenCalledWith(
      'deposit-op-1',
      expect.any(Function),
      expect.any(Function),
    )

    const subscribeCall = mockSubscribeDeposit.mock.calls[0]
    expect(subscribeCall).toBeDefined()

    const onDepositState = subscribeCall?.[1]
    if (typeof onDepositState !== 'function') {
      throw new Error('Expected subscribeDeposit success callback')
    }

    onDepositState({
      Confirmed: {
        btc_deposited: 21_000,
        btc_out_point: { txid: 'txid', vout: 0 },
      },
    })
    await flushPromises()

    expect(mockUpdateBalance).toHaveBeenCalledTimes(1)
    expect(mockRouterPush).toHaveBeenCalledWith({
      name: '/received-onchain',
      query: { amount: '21000' },
    })
  })
})
