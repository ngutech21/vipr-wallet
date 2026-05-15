import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import TransactionDetailsPage from 'src/pages/transaction/[id].vue'
import { PassthroughStub, QBtnStub } from '../mocks/quasar-stubs'

const mockRouterReplace = vi.hoisted(() => vi.fn())
const mockGetTransactionByOperationId = vi.hoisted(() => vi.fn())
const mockUseRoute = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRoute: (...args: unknown[]) => mockUseRoute(...args),
  useRouter: () => ({
    replace: mockRouterReplace,
  }),
}))

vi.mock('src/stores/wallet', () => ({
  useWalletStore: () => ({
    getTransactionByOperationId: mockGetTransactionByOperationId,
  }),
}))

describe('TransactionDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseRoute.mockReturnValue({
      params: {
        id: 'tx-1',
      },
      query: {},
    })
    mockGetTransactionByOperationId.mockResolvedValue(null)
    mockRouterReplace.mockResolvedValue(undefined)
  })

  it('navigates back home from the toolbar button', async () => {
    const wrapper = mount(TransactionDetailsPage, {
      global: {
        stubs: {
          transition: false,
          LightningTransactionDetails: true,
          EcashTransactionDetails: true,
          WalletTransactionDetails: true,
          'q-page': PassthroughStub,
          'q-btn': QBtnStub,
          'q-spinner': true,
          'q-icon': true,
        },
      },
    })

    await flushPromises()
    await wrapper.get('[data-testid="transaction-details-back-btn"]').trigger('click')

    expect(mockRouterReplace).toHaveBeenCalledWith({ name: '/' })
  })

  it('navigates back to transaction history when opened from the history page', async () => {
    mockUseRoute.mockReturnValue({
      params: {
        id: 'tx-1',
      },
      query: {
        backTo: 'transactions',
      },
    })

    const wrapper = mount(TransactionDetailsPage, {
      global: {
        stubs: {
          transition: false,
          LightningTransactionDetails: true,
          EcashTransactionDetails: true,
          WalletTransactionDetails: true,
          'q-page': PassthroughStub,
          'q-btn': QBtnStub,
          'q-spinner': true,
          'q-icon': true,
        },
      },
    })

    await flushPromises()
    await wrapper.get('[data-testid="transaction-details-back-btn"]').trigger('click')

    expect(mockRouterReplace).toHaveBeenCalledWith({ name: '/transactions' })
  })
})
