/* eslint-disable vue/one-component-per-file */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { Quasar } from 'quasar'
import { computed, defineComponent, type PropType } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import { createMemoryHistory, createRouter } from 'vue-router'
import FederationsPage from 'src/pages/federations/index.vue'
import type { Federation } from 'src/types/federation'
import type { FederationJoinFlow } from 'src/composables/useFederationJoinFlow'

const createMockFederation = (overrides: Partial<Federation> = {}): Federation => ({
  title: 'Test Federation',
  inviteCode: 'fed11test',
  federationId: 'abc123def456',
  modules: [],
  ...overrides,
})

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

describe('FederationsPage.vue', () => {
  let wrapper: VueWrapper | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.restoreAllMocks()
  })

  async function createWrapper(federations: Federation[] = []) {
    const pinia = createTestingPinia({
      initialState: {
        federation: {
          federations,
          selectedFederationId: federations[0]?.federationId ?? null,
        },
      },
      stubActions: true,
      createSpy: vi.fn,
    })

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/federations',
          name: '/federations/',
          component: { template: '<div />' },
        },
        {
          path: '/federation/:id',
          name: '/federation/[id]',
          component: { template: '<div />' },
        },
      ],
    })

    await router.push('/federations')
    await router.isReady()

    wrapper = mount(FederationsPage, {
      global: {
        plugins: [Quasar, pinia, router],
        stubs: {
          FederationJoinDialogs: FederationJoinDialogsStub,
          FederationList: true,
          QPage: defineComponent({
            name: 'QPage',
            template: '<div><slot /></div>',
          }),
          QBtn: defineComponent({
            name: 'QBtn',
            template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
          }),
        },
      },
    })

    await flushPromises()
    return wrapper
  }

  it('renders without render-function/hoisted-vnode Vue warnings', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await createWrapper([createMockFederation()])
    await flushPromises()

    const messages = [...warnSpy.mock.calls, ...errorSpy.mock.calls]
      .map((args) => args.map((arg) => String(arg)).join(' '))
      .join('\n')

    expect(messages).not.toContain('withDirectives can only be used inside render functions')
    expect(messages).not.toContain(
      'Missing ref owner context. ref cannot be used on hoisted vnodes',
    )
  })

  it('opens the shared federation join flow from the add button', async () => {
    await createWrapper([])

    expect(wrapper?.get('[data-testid="federation-join-dialogs-stub"]').attributes()).toMatchObject(
      {
        'data-selection-open': 'false',
      },
    )

    await wrapper?.get('[data-testid="add-federation-button"]').trigger('click')
    await flushPromises()

    expect(wrapper?.get('[data-testid="federation-join-dialogs-stub"]').attributes()).toMatchObject(
      {
        'data-selection-open': 'true',
      },
    )
  })
})
