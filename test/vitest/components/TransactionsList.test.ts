import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { reactive } from 'vue'
import type {
  EcashTransaction,
  LightningTransaction,
  OperationKey,
  Transactions,
  WalletTransaction,
} from '@fedimint/core'
import TransactionsList from 'src/components/TransactionsList.vue'

const mockRouterPush = vi.hoisted(() => vi.fn())
const mockGetTransactionsPage = vi.hoisted(() => vi.fn())
const federationState = vi.hoisted(() => ({
  selectedFederationId: 'fed-1',
}))
const federationStore = reactive(federationState)

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}))

vi.mock('src/stores/wallet', () => ({
  useWalletStore: () => ({
    getTransactionsPage: mockGetTransactionsPage,
  }),
}))

vi.mock('src/stores/federation', () => ({
  useFederationStore: () => federationStore,
}))

function createOperationKey(operationId: string): OperationKey {
  return {
    operation_id: operationId,
    creation_time: {
      secs_since_epoch: 1_234_567_890,
      nanos_since_epoch: 0,
    },
  } as OperationKey
}

function createLightningTransaction(
  overrides: Partial<LightningTransaction> = {},
): LightningTransaction {
  return {
    kind: 'ln',
    operationId: 'ln-op-1',
    type: 'send',
    invoice: 'lnbc1test',
    amountMsats: 1_000,
    fee: 0,
    timestamp: 1_234_567_890_000,
    ...overrides,
  } as LightningTransaction
}

function createEcashTransaction(overrides: Partial<EcashTransaction> = {}): EcashTransaction {
  return {
    kind: 'mint',
    operationId: 'mint-op-1',
    type: 'receive',
    amountMsats: 2_000,
    timestamp: 1_234_567_890_000,
    ...overrides,
  } as EcashTransaction
}

function createWalletTransaction(overrides: Partial<WalletTransaction> = {}): WalletTransaction {
  return {
    kind: 'wallet',
    operationId: 'wallet-op-1',
    type: 'deposit',
    onchainAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    amountMsats: 3_000,
    fee: 0,
    timestamp: 1_234_567_890_000,
    ...overrides,
  } as WalletTransaction
}

function createPageResult(
  transactions: Transactions[],
  overrides: {
    nextCursor?: OperationKey | null
    hasMore?: boolean
  } = {},
) {
  return {
    transactions,
    nextCursor: overrides.nextCursor ?? null,
    hasMore: overrides.hasMore ?? false,
  }
}

function createWrapper(mode: 'home' | 'history' = 'home') {
  return mount(TransactionsList, {
    props: {
      mode,
    },
    global: {
      stubs: {
        LightningTransactionItem: {
          name: 'LightningTransactionItem',
          props: {
            transaction: { type: Object, required: true },
          },
          emits: ['click'],
          template:
            '<button data-testid="lightning-transaction-item" @click="$emit(\'click\', transaction.operationId)">{{ transaction.operationId }}</button>',
        },
        EcashTransactionItem: {
          name: 'EcashTransactionItem',
          props: {
            transaction: { type: Object, required: true },
          },
          emits: ['click'],
          template:
            '<button data-testid="ecash-transaction-item" @click="$emit(\'click\', transaction.operationId)">{{ transaction.operationId }}</button>',
        },
        WalletTransactionItem: {
          name: 'WalletTransactionItem',
          props: {
            transaction: { type: Object, required: true },
          },
          emits: ['click'],
          template:
            '<button data-testid="wallet-transaction-item" @click="$emit(\'click\', transaction.operationId)">{{ transaction.operationId }}</button>',
        },
        'q-item': {
          template: '<div v-bind="$attrs"><slot /></div>',
        },
        'q-item-section': {
          template: '<div><slot /></div>',
        },
        'q-btn': {
          name: 'QBtn',
          props: {
            disable: { type: Boolean, default: false },
            loading: { type: Boolean, default: false },
            label: { type: String, default: '' },
          },
          emits: ['click'],
          template:
            '<button v-bind="$attrs" :disabled="disable" @click="$emit(\'click\')">{{ loading ? "loading" : label }}<slot /></button>',
        },
        'q-spinner-dots': true,
      },
    },
  })
}

describe('TransactionsList.vue', () => {
  let wrapper: VueWrapper | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    federationStore.selectedFederationId = 'fed-1'
    mockRouterPush.mockResolvedValue(undefined)
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
  })

  it('loads the latest 5 transactions on home and shows the full history action when more exist', async () => {
    mockGetTransactionsPage.mockResolvedValue(
      createPageResult(
        [
          createLightningTransaction(),
          createEcashTransaction(),
          createWalletTransaction(),
          createLightningTransaction({ operationId: 'ln-op-2' }),
          createWalletTransaction({ operationId: 'wallet-op-2' }),
        ],
        { hasMore: true, nextCursor: createOperationKey('wallet-op-2') },
      ),
    )

    wrapper = createWrapper('home')
    await flushPromises()

    expect(mockGetTransactionsPage).toHaveBeenCalledWith(5)
    expect(wrapper.findAll('[data-testid$="-transaction-item"]')).toHaveLength(5)
    expect(wrapper.get('[data-testid="transactions-show-full-history-btn"]').text()).toContain(
      'Show full history',
    )
  })

  it('hides the full history action on home when all transactions are already shown', async () => {
    mockGetTransactionsPage.mockResolvedValue(
      createPageResult([createLightningTransaction()], {
        hasMore: false,
      }),
    )

    wrapper = createWrapper('home')
    await flushPromises()

    expect(wrapper.findAll('[data-testid$="-transaction-item"]')).toHaveLength(1)
    expect(wrapper.find('[data-testid="transactions-show-full-history-btn"]').exists()).toBe(false)
  })

  it('keeps the empty state on home when no transactions exist', async () => {
    mockGetTransactionsPage.mockResolvedValue(createPageResult([]))

    wrapper = createWrapper('home')
    await flushPromises()

    expect(wrapper.get('[data-testid="transactions-empty-state"]').text()).toContain(
      'No transactions yet',
    )
    expect(wrapper.find('[data-testid="transactions-show-full-history-btn"]').exists()).toBe(false)
  })

  it('routes to the full history page from home', async () => {
    mockGetTransactionsPage.mockResolvedValue(
      createPageResult([createLightningTransaction()], {
        hasMore: true,
        nextCursor: createOperationKey('ln-op-1'),
      }),
    )

    wrapper = createWrapper('home')
    await flushPromises()
    await wrapper.get('[data-testid="transactions-show-full-history-btn"]').trigger('click')

    expect(mockRouterPush).toHaveBeenCalledWith({ path: '/transactions' })
  })

  it('loads history pages in batches of 20 and appends on show more', async () => {
    mockGetTransactionsPage
      .mockResolvedValueOnce(
        createPageResult(
          [
            createLightningTransaction({ operationId: 'ln-op-1' }),
            createEcashTransaction({ operationId: 'mint-op-1' }),
          ],
          { hasMore: true, nextCursor: createOperationKey('mint-op-1') },
        ),
      )
      .mockResolvedValueOnce(
        createPageResult([createWalletTransaction({ operationId: 'wallet-op-1' })], {
          hasMore: false,
          nextCursor: null,
        }),
      )

    wrapper = createWrapper('history')
    await flushPromises()

    expect(mockGetTransactionsPage).toHaveBeenNthCalledWith(1, 20)
    expect(wrapper.findAll('[data-testid$="-transaction-item"]')).toHaveLength(2)
    expect(wrapper.get('[data-testid="transactions-show-more-btn"]').text()).toContain('Show more')

    await wrapper.get('[data-testid="transactions-show-more-btn"]').trigger('click')
    await flushPromises()

    expect(mockGetTransactionsPage).toHaveBeenNthCalledWith(2, 20, createOperationKey('mint-op-1'))
    expect(wrapper.findAll('[data-testid$="-transaction-item"]')).toHaveLength(3)
    expect(wrapper.find('[data-testid="transactions-show-more-btn"]').exists()).toBe(false)
  })

  it('keeps loaded history visible when show more fails and allows retry', async () => {
    mockGetTransactionsPage
      .mockResolvedValueOnce(
        createPageResult([createLightningTransaction()], {
          hasMore: true,
          nextCursor: createOperationKey('ln-op-1'),
        }),
      )
      .mockRejectedValueOnce(new Error('load more failed'))

    wrapper = createWrapper('history')
    await flushPromises()

    await wrapper.get('[data-testid="transactions-show-more-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[data-testid$="-transaction-item"]')).toHaveLength(1)
    expect(wrapper.find('[data-testid="transactions-show-more-btn"]').exists()).toBe(true)
  })

  it('reloads the first page when the selected federation changes', async () => {
    mockGetTransactionsPage
      .mockResolvedValueOnce(
        createPageResult([createLightningTransaction({ operationId: 'ln-op-fed-1' })], {
          hasMore: false,
        }),
      )
      .mockResolvedValueOnce(
        createPageResult([createWalletTransaction({ operationId: 'wallet-op-fed-2' })], {
          hasMore: false,
        }),
      )

    wrapper = createWrapper('history')
    await flushPromises()
    expect(wrapper.text()).toContain('ln-op-fed-1')

    federationStore.selectedFederationId = 'fed-2'
    await flushPromises()

    expect(mockGetTransactionsPage).toHaveBeenNthCalledWith(2, 20)
    expect(wrapper.text()).toContain('wallet-op-fed-2')
    expect(wrapper.text()).not.toContain('ln-op-fed-1')
  })

  it('opens transaction details when a row is clicked', async () => {
    mockGetTransactionsPage.mockResolvedValue(
      createPageResult([createWalletTransaction({ operationId: 'wallet-op-detail' })]),
    )

    wrapper = createWrapper('history')
    await flushPromises()
    await wrapper.get('[data-testid="wallet-transaction-item"]').trigger('click')

    expect(mockRouterPush).toHaveBeenCalledWith({
      name: '/transaction/[id]',
      params: {
        id: 'wallet-op-detail',
      },
    })
  })
})
