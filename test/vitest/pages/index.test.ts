/* eslint-disable vue/one-component-per-file */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import IndexPage from 'src/pages/index.vue'

type HomePageVm = {
  showDiscover: boolean
}

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

  it('opens add federation preview only after discovery dialog hides', async () => {
    const pinia = createTestingPinia({
      initialState: {
        federation: {
          federations: [],
          selectedFederationId: null,
        },
        wallet: {
          balance: 0,
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
          DiscoverFederations: defineComponent({
            name: 'DiscoverFederations',
            emits: ['showAdd'],
            template: `
              <div data-testid="discover-federations-stub">
                <button
                  data-testid="discover-open-preview-btn"
                  @click="$emit('showAdd', { inviteCode: 'fed11preview' })"
                >
                  open preview
                </button>
              </div>
            `,
          }),
          AddFederation: defineComponent({
            name: 'AddFederation',
            props: {
              backTarget: { type: String, required: false, default: 'invite' },
            },
            template: `
              <div data-testid="add-federation-stub">
                <div data-testid="add-federation-back-target">{{ backTarget }}</div>
              </div>
            `,
          }),
          SendEcashSelection: true,
          ReceiveEcashSelection: true,
          'q-page': { template: '<div><slot /></div>' },
          'q-chip': { template: '<div><slot /></div>' },
          'q-icon': { template: '<i />' },
          'q-page-sticky': { template: '<div><slot /></div>' },
          'q-dialog': defineComponent({
            name: 'QDialog',
            props: {
              modelValue: { type: Boolean, required: false, default: false },
            },
            emits: ['hide', 'update:modelValue'],
            watch: {
              modelValue(newValue: boolean, oldValue: boolean) {
                if (oldValue === true && newValue === false) {
                  this.$emit('hide')
                }
              },
            },
            template: '<div v-if="modelValue"><slot /></div>',
          }),
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

    ;(wrapper.vm as unknown as HomePageVm).showDiscover = true
    await flushPromises()

    await wrapper.get('[data-testid="discover-open-preview-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="discover-federations-stub"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="add-federation-back-target"]').text()).toBe('discover')
  })
})
