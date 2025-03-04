import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { Quasar } from 'quasar'
import { createTestingPinia } from '@pinia/testing'
import FederationList from 'src/components/FederationList.vue'
import { useFederationStore } from 'src/stores/federation'
import { vi } from 'vitest'

describe('FederationList.vue', () => {
  it('renders federation name and handles store interactions', async () => {
    // Mount with testing pinia instance
    const wrapper = mount(FederationList, {
      global: {
        plugins: [
          Quasar,
          createTestingPinia({
            initialState: {
              federation: {
                federations: [{ inviteCode: '1', title: 'Test Federation', federationId: '12345' }],
                selectedFederation: null,
              },
            },
            stubActions: true, // Automatically stubs all actions
            createSpy: vi.fn,
          }),
        ],
      },
    })

    const store = useFederationStore()

    // Verify content rendering
    expect(wrapper.text()).toContain('Test Federation')

    // Test store interaction
    const federationItem = wrapper.find('.federation-card')
    await federationItem.trigger('click')

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(store.selectFederation).toHaveBeenCalledWith(store.federations[0]) // Or check if the action was called
  })
})
