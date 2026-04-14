import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { defineComponent, reactive } from 'vue'
import SentOnchainPage from 'src/pages/sent-onchain.vue'
import type { WalletTransaction } from '@fedimint/core'

const mockRouterPush = vi.hoisted(() => vi.fn())
const mockUseRoute = vi.hoisted(() => vi.fn())
const mockGetTransactions = vi.hoisted(() => vi.fn())
const mockUpdateBalance = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRoute: (...args: unknown[]) => mockUseRoute(...args),
  useRouter: () => ({
    push: mockRouterPush,
  }),
}))

vi.mock('src/stores/wallet', () => ({
  useWalletStore: () => ({
    getTransactions: mockGetTransactions,
    updateBalance: mockUpdateBalance,
  }),
}))

describe('SentOnchainPage', () => {
  type RouteState = {
    query: {
      operationId?: string
      address?: string
      amount?: string
    }
  }

  let routeState: RouteState
  let wrapper: VueWrapper

  function createWalletTransaction(overrides: Partial<WalletTransaction> = {}): WalletTransaction {
    return {
      kind: 'wallet',
      operationId: 'withdraw-op-1',
      type: 'withdraw',
      onchainAddress: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
      amountMsats: 21_000_000,
      fee: 5_000,
      outcome: 'Confirmed',
      timestamp: 1_234_567_890_000,
      ...overrides,
    } as WalletTransaction
  }

  function createWrapper() {
    return mount(SentOnchainPage, {
      global: {
        stubs: {
          'q-page': {
            template: '<div><slot /></div>',
          },
          'q-card': {
            template: '<div><slot /></div>',
          },
          'q-badge': {
            template: '<div><slot /></div>',
          },
          'q-icon': true,
          'q-separator': true,
          'q-btn': defineComponent({
            name: 'QBtn',
            emits: ['click'],
            template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
          }),
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    routeState = reactive<RouteState>({
      query: {
        operationId: 'withdraw-op-1',
        address: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
        amount: '21000',
      },
    })
    mockUseRoute.mockImplementation(() => routeState)
    mockGetTransactions.mockResolvedValue([createWalletTransaction()])
    mockUpdateBalance.mockResolvedValue(undefined)
    mockRouterPush.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads the matching wallet transaction and offers details navigation', async () => {
    wrapper = createWrapper()
    await flushPromises()

    expect(mockGetTransactions).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Transfer submitted')
    expect(wrapper.text()).toContain('Confirmed')

    await wrapper.get('[data-testid="sent-onchain-view-details-btn"]').trigger('click')
    await flushPromises()

    expect(mockRouterPush).toHaveBeenCalledWith({
      name: '/transaction/[id]',
      params: {
        id: 'withdraw-op-1',
      },
    })
    wrapper.unmount()
  })

  it('shows a pending state until the wallet history catches up', async () => {
    mockGetTransactions.mockResolvedValue([])

    wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('Sending Bitcoin...')
    expect(wrapper.text()).toContain('Pending')
    expect(wrapper.find('[data-testid="sent-onchain-view-details-btn"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('keeps polling until the withdrawal reaches a terminal state', async () => {
    const { outcome: _pendingOutcomeRemoved, ...pendingTransactionWithoutOutcome } =
      createWalletTransaction()

    mockGetTransactions
      .mockResolvedValueOnce([pendingTransactionWithoutOutcome as WalletTransaction])
      .mockResolvedValueOnce([
        createWalletTransaction({
          outcome: 'Confirmed',
        }),
      ])

    wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('Submitted')
    expect(mockGetTransactions).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(3_000)
    await flushPromises()

    expect(mockGetTransactions).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Confirmed')
    wrapper.unmount()
  })
})
