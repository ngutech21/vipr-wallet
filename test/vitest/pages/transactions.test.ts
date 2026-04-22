import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import TransactionsPage from 'src/pages/transactions.vue'

const mockRouterPush = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}))

describe('TransactionsPage.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRouterPush.mockResolvedValue(undefined)
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
          'q-page': {
            template: '<div><slot /></div>',
          },
          'q-btn': {
            template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
          },
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
          'q-page': {
            template: '<div><slot /></div>',
          },
          'q-btn': {
            template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    })

    await wrapper.get('[data-testid="transactions-back-btn"]').trigger('click')

    expect(mockRouterPush).toHaveBeenCalledWith({ name: '/' })
  })
})
