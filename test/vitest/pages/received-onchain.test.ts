import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ReceivedOnchainPage from 'src/pages/received-onchain.vue'

const useConfettiCelebrationMock = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRoute: () => ({
    query: {
      amount: '21000',
    },
  }),
}))

vi.mock('src/composables/useConfettiCelebration', () => ({
  useConfettiCelebration: useConfettiCelebrationMock,
}))

const SlotStub = {
  template: '<div><slot /></div>',
}

describe('ReceivedOnchainPage', () => {
  it('renders an onchain-specific success state', () => {
    const wrapper = mount(ReceivedOnchainPage, {
      global: {
        stubs: {
          'q-page': SlotStub,
          'q-card': SlotStub,
          'q-card-section': SlotStub,
          'q-btn': {
            props: {
              label: { type: String, required: false, default: '' },
            },
            template: '<button v-bind="$attrs"><slot />{{ label }}</button>',
          },
          'q-icon': true,
        },
      },
    })

    expect(wrapper.find('[data-testid="received-onchain-page"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="received-onchain-success-state"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="received-onchain-title"]').text()).toBe('Bitcoin received')
    expect(wrapper.get('[data-testid="received-onchain-amount"]').text()).toBe('21,000 sats')
    expect(useConfettiCelebrationMock).toHaveBeenCalled()
  })
})
