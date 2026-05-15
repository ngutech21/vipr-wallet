import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SentLightningPage from 'src/pages/sent-lightning.vue'
import { PassthroughStub, QBtnStub } from '../mocks/quasar-stubs'

const routeQuery = vi.hoisted(() => ({
  amount: '21000',
  fee: '1234',
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
  return mount(SentLightningPage, {
    global: {
      stubs: {
        'q-page': PassthroughStub,
        'q-card': PassthroughStub,
        'q-card-section': PassthroughStub,
        'q-separator': true,
        'q-btn': QBtnStub,
        'q-icon': true,
      },
    },
  })
}

describe('SentLightningPage', () => {
  it('renders the sent lightning amount and fee from route query', () => {
    routeQuery.amount = '21000'
    routeQuery.fee = '1234'

    const wrapper = mountPage()

    expect(wrapper.text()).toContain('Payment sent')
    expect(wrapper.text()).toContain('21,000 sats')
    expect(wrapper.text()).toContain('Network fee')
    expect(wrapper.text()).toContain('1,234 mSats')
    expect(wrapper.find('[data-testid="sent-lightning-back-home-btn"]').exists()).toBe(true)
    expect(useConfettiCelebrationMock).toHaveBeenCalled()
  })

  it('falls back to zero when route query values are not numeric', () => {
    routeQuery.amount = 'invalid'
    routeQuery.fee = 'not-a-fee'

    const wrapper = mountPage()

    expect(wrapper.text()).toContain('0 sats')
    expect(wrapper.text()).toContain('0 mSats')
  })
})
