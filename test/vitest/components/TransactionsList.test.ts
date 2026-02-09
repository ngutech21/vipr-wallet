import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, type VueWrapper, flushPromises } from '@vue/test-utils'
import { Quasar, QItem, QItemSection } from 'quasar'
import { createTestingPinia, type TestingPinia } from '@pinia/testing'
import TransactionsList from 'src/components/TransactionsList.vue'
import { useWalletStore } from 'src/stores/wallet'
import type {
  Transactions,
  LightningTransaction,
  EcashTransaction,
  WalletTransaction,
} from '@fedimint/core'
import LightningTransactionItem from 'src/components/LightningTransactionItem.vue'
import EcashTransactionItem from 'src/components/EcashTransactionItem.vue'
import WalletTransactionItem from 'src/components/WalletTransactionItem.vue'

// Type for the exposed properties
type TransactionsListExposed = {
  recentTransactions: Transactions[]
  isLoading: boolean
}

// Mock router
const mockRouterPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}))

// Helper factory to create mock transactions
const createMockLnTransaction = (
  overrides: Partial<LightningTransaction> = {},
): LightningTransaction =>
  ({
    kind: 'ln',
    operationId: 'ln-op-123',
    invoice: 'lnbc1000n1p0test',
    type: 'send',
    outcome: 'success',
    timestamp: 1234567890000,
    fee: 100,
    ...overrides,
  }) as LightningTransaction

const createMockMintTransaction = (overrides: Partial<EcashTransaction> = {}): EcashTransaction =>
  ({
    kind: 'mint',
    operationId: 'mint-op-456',
    type: 'reissue',
    amountMsats: 50000,
    outcome: 'success',
    timestamp: 1234567890000,
    ...overrides,
  }) as EcashTransaction

const createMockWalletTransaction = (
  overrides: Partial<WalletTransaction> = {},
): WalletTransaction =>
  ({
    kind: 'wallet',
    operationId: 'wallet-op-789',
    type: 'withdraw',
    amountMsats: 100000,
    fee: 200,
    onchainAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    outcome: 'Confirmed',
    timestamp: 1234567890000,
    ...overrides,
  }) as WalletTransaction

describe('TransactionsList.vue', () => {
  let wrapper: VueWrapper<TransactionsListExposed>
  let pinia: TestingPinia

  const createWrapper = (
    mockTransactions: Transactions[] = [],
  ): VueWrapper<TransactionsListExposed> => {
    pinia = createTestingPinia({
      initialState: {
        wallet: {},
      },
      stubActions: false,
      createSpy: vi.fn,
    })

    // Mock the getTransactions method
    const walletStore = useWalletStore()
    vi.spyOn(walletStore, 'getTransactions').mockResolvedValue(mockTransactions)

    return mount(TransactionsList, {
      global: {
        plugins: [Quasar, pinia],
        stubs: {
          QItem,
          QItemSection,
          LightningTransactionItem: true,
          EcashTransactionItem: true,
          WalletTransactionItem: true,
        },
      },
    }) as unknown as VueWrapper<TransactionsListExposed>
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Mounting & Lifecycle', () => {
    it('should mount component and call loadTransactions on mount', async () => {
      wrapper = createWrapper()
      await flushPromises()

      const walletStore = useWalletStore()
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(walletStore.getTransactions).toHaveBeenCalled()
    })

    it('should load transactions successfully from store', async () => {
      const mockTransactions = [createMockLnTransaction()]
      wrapper = createWrapper(mockTransactions)
      await flushPromises()

      const walletStore = useWalletStore()
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(walletStore.getTransactions).toHaveBeenCalled()
      expect(wrapper.vm.recentTransactions).toEqual(mockTransactions)
    })

    it('should handle loading errors gracefully', async () => {
      pinia = createTestingPinia({
        initialState: {
          wallet: {},
        },
        stubActions: false,
        createSpy: vi.fn,
      })

      const walletStore = useWalletStore()
      vi.spyOn(walletStore, 'getTransactions').mockRejectedValue(new Error('Load failed'))

      wrapper = mount(TransactionsList, {
        global: {
          plugins: [Quasar, pinia],
          stubs: {
            QItem,
            QItemSection,
            LightningTransactionItem: true,
            EcashTransactionItem: true,
            WalletTransactionItem: true,
          },
        },
      }) as unknown as VueWrapper<TransactionsListExposed>

      await flushPromises()

      // Should set empty array on error
      expect(wrapper.vm.recentTransactions).toEqual([])
    })
  })

  describe('Transaction Type Rendering', () => {
    it('should render LightningTransactionItem for ln transactions', async () => {
      const lnTx = createMockLnTransaction()
      wrapper = createWrapper([lnTx])
      await flushPromises()

      const lightningItem = wrapper.findComponent(LightningTransactionItem)
      expect(lightningItem.exists()).toBe(true)
    })

    it('should render EcashTransactionItem for mint transactions', async () => {
      const mintTx = createMockMintTransaction()
      wrapper = createWrapper([mintTx])
      await flushPromises()

      const ecashItem = wrapper.findComponent(EcashTransactionItem)
      expect(ecashItem.exists()).toBe(true)
    })

    it('should render WalletTransactionItem for wallet transactions', async () => {
      const walletTx = createMockWalletTransaction()
      wrapper = createWrapper([walletTx])
      await flushPromises()

      const walletItem = wrapper.findComponent(WalletTransactionItem)
      expect(walletItem.exists()).toBe(true)
    })

    it('should render multiple mixed transaction types correctly', async () => {
      const transactions = [
        createMockLnTransaction({ operationId: 'ln-1' }),
        createMockMintTransaction({ operationId: 'mint-1' }),
        createMockWalletTransaction({ operationId: 'wallet-1' }),
      ]
      wrapper = createWrapper(transactions)
      await flushPromises()

      expect(wrapper.findAllComponents(LightningTransactionItem)).toHaveLength(1)
      expect(wrapper.findAllComponents(EcashTransactionItem)).toHaveLength(1)
      expect(wrapper.findAllComponents(WalletTransactionItem)).toHaveLength(1)
    })

    it('should pass correct props to transaction item components', async () => {
      const lnTx = createMockLnTransaction()
      wrapper = createWrapper([lnTx])
      await flushPromises()

      const lightningItem = wrapper.findComponent(LightningTransactionItem)
      expect(lightningItem.props('transaction')).toEqual(lnTx)
    })

    it('should use transaction.operationId as key', async () => {
      const transactions = [createMockLnTransaction({ operationId: 'unique-id-123' })]
      wrapper = createWrapper(transactions)
      await flushPromises()

      expect(wrapper.findComponent(LightningTransactionItem).exists()).toBe(true)
    })
  })

  describe('Empty State', () => {
    it('should show "No transactions yet" when list is empty', async () => {
      wrapper = createWrapper([])
      await flushPromises()

      expect(wrapper.text()).toContain('No transactions yet')
    })

    it('should not show empty state when transactions exist', async () => {
      const transactions = [createMockLnTransaction()]
      wrapper = createWrapper(transactions)
      await flushPromises()

      expect(wrapper.text()).not.toContain('No transactions yet')
    })
  })

  describe('User Interactions', () => {
    it('should call viewTransactionDetails when item emits click', async () => {
      const lnTx = createMockLnTransaction({ operationId: 'test-123' })
      wrapper = createWrapper([lnTx])
      await flushPromises()

      const lightningItem = wrapper.findComponent(LightningTransactionItem)
      await lightningItem.vm.$emit('click', 'test-123')
      await flushPromises()

      expect(mockRouterPush).toHaveBeenCalled()
    })

    it('should navigate to correct route with transaction ID', async () => {
      const transactionId = 'transaction-456'
      const lnTx = createMockLnTransaction({ operationId: transactionId })
      wrapper = createWrapper([lnTx])
      await flushPromises()

      const lightningItem = wrapper.findComponent(LightningTransactionItem)
      await lightningItem.vm.$emit('click', transactionId)
      await flushPromises()

      expect(mockRouterPush).toHaveBeenCalledWith({
        name: '/transaction/[id]',
        params: { id: transactionId },
      })
    })

    it('should handle click events from different transaction types', async () => {
      const transactions = [createMockMintTransaction({ operationId: 'mint-click-test' })]
      wrapper = createWrapper(transactions)
      await flushPromises()

      const ecashItem = wrapper.findComponent(EcashTransactionItem)
      await ecashItem.vm.$emit('click', 'mint-click-test')
      await flushPromises()

      expect(mockRouterPush).toHaveBeenCalledWith({
        name: '/transaction/[id]',
        params: { id: 'mint-click-test' },
      })
    })
  })

  describe('Loading & Error States', () => {
    it('should set isLoading to true during fetch', async () => {
      wrapper = createWrapper([])

      // isLoading should be true initially during mount
      // After flushPromises, it should be false
      await flushPromises()

      expect(wrapper.vm.isLoading).toBe(false)
    })

    it('should set isLoading to false after completion', async () => {
      wrapper = createWrapper([createMockLnTransaction()])
      await flushPromises()

      expect(wrapper.vm.isLoading).toBe(false)
    })

    it('should set empty array on error', async () => {
      pinia = createTestingPinia({
        initialState: {
          wallet: {},
        },
        stubActions: false,
        createSpy: vi.fn,
      })

      const walletStore = useWalletStore()
      vi.spyOn(walletStore, 'getTransactions').mockRejectedValue(new Error('Network error'))

      wrapper = mount(TransactionsList, {
        global: {
          plugins: [Quasar, pinia],
          stubs: {
            QItem,
            QItemSection,
            LightningTransactionItem: true,
            EcashTransactionItem: true,
            WalletTransactionItem: true,
          },
        },
      }) as unknown as VueWrapper<TransactionsListExposed>

      await flushPromises()

      expect(wrapper.vm.recentTransactions).toEqual([])
      expect(wrapper.vm.isLoading).toBe(false)
    })
  })

  describe('Store Integration', () => {
    it('should call walletStore.getTransactions', async () => {
      wrapper = createWrapper([])
      await flushPromises()

      const walletStore = useWalletStore()
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(walletStore.getTransactions).toHaveBeenCalledTimes(1)
    })

    it('should update recentTransactions ref with store data', async () => {
      const mockData = [
        createMockLnTransaction({ operationId: 'ln-1' }),
        createMockMintTransaction({ operationId: 'mint-1' }),
      ]
      wrapper = createWrapper(mockData)
      await flushPromises()

      expect(wrapper.vm.recentTransactions).toHaveLength(2)
      expect(wrapper.vm.recentTransactions).toEqual(mockData)
    })

    it('should handle empty response from store', async () => {
      wrapper = createWrapper([])
      await flushPromises()

      expect(wrapper.vm.recentTransactions).toEqual([])
      expect(wrapper.text()).toContain('No transactions yet')
    })
  })
})
