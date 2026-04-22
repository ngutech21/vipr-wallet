import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import TransactionDetailsPage from 'src/pages/transaction/[id].vue'

const mockRouterPush = vi.hoisted(() => vi.fn())
const mockGetTransactionByOperationId = vi.hoisted(() => vi.fn())
const mockUseRoute = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRoute: (...args: unknown[]) => mockUseRoute(...args),
  useRouter: () => ({
    push: mockRouterPush,
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
    })
    mockGetTransactionByOperationId.mockResolvedValue(null)
    mockRouterPush.mockResolvedValue(undefined)
  })

  it('navigates back home from the toolbar button', async () => {
    const wrapper = mount(TransactionDetailsPage, {
      global: {
        stubs: {
          transition: false,
          LightningTransactionDetails: true,
          EcashTransactionDetails: true,
          WalletTransactionDetails: true,
          'q-page': {
            template: '<div><slot /></div>',
          },
          'q-btn': {
            template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
          },
          'q-spinner': true,
          'q-icon': true,
        },
      },
    })

    await flushPromises()
    await wrapper.get('[data-testid="transaction-details-back-btn"]').trigger('click')

    expect(mockRouterPush).toHaveBeenCalledWith({ name: '/' })
  })

  it('uses the same navigation path for the swipe handler', async () => {
    const wrapper = mount(TransactionDetailsPage, {
      global: {
        stubs: {
          transition: false,
          LightningTransactionDetails: true,
          EcashTransactionDetails: true,
          WalletTransactionDetails: true,
          'q-page': {
            template: '<div><slot /></div>',
          },
          'q-btn': {
            template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
          },
          'q-spinner': true,
          'q-icon': true,
        },
      },
    })

    await flushPromises()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wrapper.vm as any).navigateBack()

    expect(mockRouterPush).toHaveBeenCalledWith({ name: '/' })
  })
})
