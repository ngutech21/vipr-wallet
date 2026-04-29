import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AmountDisplay from 'src/components/AmountDisplay.vue'

describe('AmountDisplay', () => {
  it('can reserve error message space without showing visible error text', () => {
    const wrapper = mount(AmountDisplay, {
      props: {
        value: '42',
        label: 'Amount in sats',
        reserveErrorSpace: true,
      },
    })

    const error = wrapper.get('.amount-display__error')
    expect(error.classes()).toContain('amount-display__error--empty')
    expect(error.attributes('aria-hidden')).toBe('true')
    expect(error.text()).toBe('')
  })

  it('shows the error message in the reserved error space', () => {
    const wrapper = mount(AmountDisplay, {
      props: {
        value: '441',
        label: 'Amount in sats',
        reserveErrorSpace: true,
        errorMessage: 'Amount must be 39 sats or less',
      },
    })

    const error = wrapper.get('.amount-display__error')
    expect(error.classes()).not.toContain('amount-display__error--empty')
    expect(error.attributes('aria-hidden')).toBe('false')
    expect(error.text()).toBe('Amount must be 39 sats or less')
  })

  it('can show an error border without rendering error text', () => {
    const wrapper = mount(AmountDisplay, {
      props: {
        value: '441',
        label: 'Amount in sats',
        errorMessage: 'Amount must be 39 sats or less',
        showErrorText: false,
      },
    })

    expect(wrapper.get('.amount-display').classes()).toContain('amount-display--error')
    expect(wrapper.find('.amount-display__error').exists()).toBe(false)
  })
})
