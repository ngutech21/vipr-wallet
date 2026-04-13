import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import IndexPage from 'src/pages/index.vue'

describe('IndexPage.vue', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('opens the send selection bottom sheet from the home send button', async () => {
    const pinia = createTestingPinia({
      initialState: {
        federation: {
          federations: [
            { title: 'Fed 1', inviteCode: 'fed11', federationId: 'fed-1', modules: [] },
          ],
          selectedFederationId: 'fed-1',
        },
        wallet: {
          balance: 125,
        },
      },
      stubActions: true,
      createSpy: vi.fn,
    })

    const wrapper = mount(IndexPage, {
      global: {
        plugins: [pinia],
        stubs: {
          TransactionsList: true,
          AddFederationSelection: true,
          DiscoverFederations: true,
          AddFederation: true,
          SendEcashSelection: {
            template: '<div data-testid="send-ecash-selection-stub" />',
          },
          ReceiveEcashSelection: true,
          'q-page': { template: '<div><slot /></div>' },
          'q-dialog': { template: '<div><slot /></div>' },
          'q-chip': { template: '<div><slot /></div>' },
          'q-icon': { template: '<i />' },
          'q-page-sticky': { template: '<div><slot /></div>' },
          QBtn: defineComponent({
            name: 'QBtn',
            props: {
              to: { type: [String, Object], required: false, default: '' },
            },
            template:
              '<button v-bind="$attrs" :data-to="typeof to === \'string\' ? to : JSON.stringify(to)" @click="$emit(\'click\')"><slot /></button>',
          }),
        },
      },
    })

    expect(wrapper.find('[data-testid="send-ecash-selection-stub"]').exists()).toBe(false)

    await wrapper.get('[data-testid="home-send-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="send-ecash-selection-stub"]').exists()).toBe(true)
  })
})
