import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import SuccessResultLayout from 'src/components/SuccessResultLayout.vue'

const useConfettiCelebrationMock = vi.hoisted(() => vi.fn())

vi.mock('src/composables/useConfettiCelebration', () => ({
  useConfettiCelebration: useConfettiCelebrationMock,
}))

const SlotStub = {
  template: '<div><slot /></div>',
}

const QBtnStub = {
  props: {
    label: { type: String, required: false, default: '' },
    to: { type: [String, Object], required: false, default: undefined },
  },
  emits: ['click'],
  template: `
    <button
      v-bind="$attrs"
      :data-label="label"
      :data-to="to == null ? '' : JSON.stringify(to)"
      @click="$emit('click')"
    >
      <slot />{{ label }}
    </button>
  `,
}

describe('SuccessResultLayout', () => {
  it('renders the result contract and default home action', async () => {
    const wrapper = mount(SuccessResultLayout, {
      props: {
        pageClass: 'page-container--lightning',
        title: 'Payment sent',
        amountText: '12 sats',
        subtitle: 'Completed.',
        pageTestId: 'result-page',
        successTestId: 'result-state',
        closeTestId: 'result-close',
        titleTestId: 'result-title',
        amountTestId: 'result-amount',
        homeTestId: 'result-home',
      },
      slots: {
        summary: '<div data-testid="summary-slot">summary</div>',
      },
      global: {
        stubs: {
          'q-page': SlotStub,
          'q-btn': QBtnStub,
          'q-icon': true,
        },
      },
    })

    expect(wrapper.find('[data-testid="result-state"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="result-title"]').text()).toBe('Payment sent')
    expect(wrapper.get('[data-testid="result-amount"]').text()).toBe('12 sats')
    expect(wrapper.find('[data-testid="summary-slot"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="result-home"]').attributes('data-to')).toBe(
      JSON.stringify({ name: '/' }),
    )

    await wrapper.get('[data-testid="result-close"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('renders custom actions and the optional confetti canvas', () => {
    const wrapper = mount(SuccessResultLayout, {
      props: {
        pageClass: 'page-container--lightning',
        title: 'Payment received',
        amountText: '71 sats',
        showConfetti: true,
      },
      slots: {
        actions: '<button data-testid="custom-action">Done</button>',
      },
      global: {
        stubs: {
          'q-page': SlotStub,
          'q-btn': QBtnStub,
          'q-icon': true,
        },
      },
    })

    expect(wrapper.find('[data-testid="success-confetti-canvas"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="custom-action"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="result-home"]').exists()).toBe(false)
    expect(useConfettiCelebrationMock).toHaveBeenCalled()
  })
})
