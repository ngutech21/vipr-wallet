import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ReceivedLightningPage from 'src/pages/received-lightning.vue'
import { PassthroughStub, QBtnStub } from '../mocks/quasar-stubs'

const routeQuery = vi.hoisted(() => ({
  amount: '21000',
}))
const useConfettiCelebrationMock = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRoute: () => ({
    query: routeQuery,
  }),
}))

vi.mock('src/composables/useConfettiCelebration', () => ({
  useConfettiCelebration: useConfettiCelebrationMock,
}))

function mountPage() {
  return mount(ReceivedLightningPage, {
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
}

describe('ReceivedLightningPage', () => {
  it('renders the received lightning amount from route query', () => {
    routeQuery.amount = '21000'

    const wrapper = mountPage()

    expect(wrapper.find('[data-testid="received-lightning-page"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="received-lightning-success-state"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="received-lightning-title"]').text()).toBe('Payment received')
    expect(wrapper.get('[data-testid="received-lightning-amount"]').text()).toBe('21,000 sats')
    expect(wrapper.text()).toContain('Amount')
    expect(wrapper.text()).toContain('21,000 sats')
    expect(useConfettiCelebrationMock).toHaveBeenCalled()
  })

  it('falls back to zero when the amount query is not numeric', () => {
    routeQuery.amount = 'invalid'

    const wrapper = mountPage()

    expect(wrapper.get('[data-testid="received-lightning-amount"]').text()).toBe('0 sats')
  })
})
