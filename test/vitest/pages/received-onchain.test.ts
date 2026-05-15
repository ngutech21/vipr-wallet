import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ReceivedOnchainPage from 'src/pages/received-onchain.vue'
import { PassthroughStub, QBtnStub } from '../mocks/quasar-stubs'

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

describe('ReceivedOnchainPage', () => {
  it('renders an onchain-specific success state', () => {
    const wrapper = mount(ReceivedOnchainPage, {
      global: {
        stubs: {
          'q-page': PassthroughStub,
          'q-card': PassthroughStub,
          'q-card-section': PassthroughStub,
          'q-btn': QBtnStub,
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
