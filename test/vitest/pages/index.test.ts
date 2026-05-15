import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { computed, defineComponent, type PropType } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import IndexPage from 'src/pages/index.vue'
import type { FederationJoinFlow } from 'src/composables/useFederationJoinFlow'
import { PassthroughStub, QBtnStub } from '../mocks/quasar-stubs'

const FederationJoinDialogsStub = defineComponent({
  name: 'FederationJoinDialogs',
  props: {
    flow: {
      type: Object as PropType<FederationJoinFlow>,
      required: true,
    },
  },
  setup(props) {
    return {
      selectionOpen: computed(() => props.flow.showSelection.value),
    }
  },
  template:
    '<div data-testid="federation-join-dialogs-stub" :data-selection-open="selectionOpen ? \'true\' : \'false\'" />',
})

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
          FederationJoinDialogs: FederationJoinDialogsStub,
          SendEcashSelection: {
            template: '<div data-testid="send-ecash-selection-stub" />',
          },
          ReceiveEcashSelection: true,
          'q-page': PassthroughStub,
          'q-dialog': PassthroughStub,
          'q-chip': PassthroughStub,
          'q-icon': { template: '<i />' },
          'q-page-sticky': PassthroughStub,
          QBtn: QBtnStub,
        },
      },
    })

    expect(wrapper.find('[data-testid="send-ecash-selection-stub"]').exists()).toBe(false)

    await wrapper.get('[data-testid="home-send-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="send-ecash-selection-stub"]').exists()).toBe(true)
  })

  it('opens the shared federation join flow from the empty home action', async () => {
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
          FederationJoinDialogs: FederationJoinDialogsStub,
          SendEcashSelection: true,
          ReceiveEcashSelection: true,
          'q-page': PassthroughStub,
          'q-chip': PassthroughStub,
          'q-icon': { template: '<i />' },
          'q-page-sticky': PassthroughStub,
          QBtn: QBtnStub,
        },
      },
    })

    expect(wrapper.get('[data-testid="federation-join-dialogs-stub"]').attributes()).toMatchObject({
      'data-selection-open': 'false',
    })

    await wrapper.get('[data-testid="home-join-federation-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="federation-join-dialogs-stub"]').attributes()).toMatchObject({
      'data-selection-open': 'true',
    })
  })
})
