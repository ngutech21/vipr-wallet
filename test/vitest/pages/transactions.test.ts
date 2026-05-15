import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import TransactionsPage from 'src/pages/transactions.vue'
import { PassthroughStub, QBtnStub } from '../mocks/quasar-stubs'

const mockRouterReplace = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRouter: () => ({
    replace: mockRouterReplace,
  }),
}))

describe('TransactionsPage.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRouterReplace.mockResolvedValue(undefined)
  })

  it('renders the full history list mode', () => {
    const wrapper = mount(TransactionsPage, {
      global: {
        stubs: {
          transition: false,
          TransactionsList: defineComponent({
            name: 'TransactionsList',
            props: {
              mode: { type: String, required: false, default: '' },
            },
            template: '<div data-testid="transactions-list-stub" :data-mode="mode" />',
          }),
          'q-page': PassthroughStub,
          'q-btn': QBtnStub,
        },
      },
    })

    expect(wrapper.find('[data-testid="transactions-page"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="transactions-list-stub"]').attributes('data-mode')).toBe(
      'history',
    )
  })

  it('navigates back home from the toolbar button', async () => {
    const wrapper = mount(TransactionsPage, {
      global: {
        stubs: {
          transition: false,
          TransactionsList: true,
          'q-page': PassthroughStub,
          'q-btn': QBtnStub,
        },
      },
    })

    await wrapper.get('[data-testid="transactions-back-btn"]').trigger('click')

    expect(mockRouterReplace).toHaveBeenCalledWith({ name: '/' })
  })
})
