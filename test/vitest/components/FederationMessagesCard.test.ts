import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FederationMessagesCard from 'src/components/federation/FederationMessagesCard.vue'

const SlotStub = {
  template: '<div><slot /></div>',
}

describe('FederationMessagesCard', () => {
  it('does not render for preview-only metadata', () => {
    const wrapper = mount(FederationMessagesCard, {
      props: {
        metadata: {
          previewMessage: 'Preview only',
        },
      },
      global: {
        stubs: {
          'q-card': SlotStub,
          'q-card-section': SlotStub,
        },
      },
    })

    expect(wrapper.text()).toBe('')
  })

  it('renders welcome and popup countdown messages', () => {
    const wrapper = mount(FederationMessagesCard, {
      props: {
        metadata: {
          welcomeMessage: 'Welcome',
          popupCountdownMessage: 'Migration soon',
          popupEndTimestamp: 1_893_456_000,
        },
      },
      global: {
        stubs: {
          'q-card': SlotStub,
          'q-card-section': SlotStub,
        },
      },
    })

    expect(wrapper.text()).toContain('Welcome Message')
    expect(wrapper.text()).toContain('Welcome')
    expect(wrapper.text()).toContain('End Message')
    expect(wrapper.text()).toContain('Migration soon')
    expect(wrapper.text()).toContain('Ends:')
  })
})
