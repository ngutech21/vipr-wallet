/* eslint-disable vue/one-component-per-file */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { Quasar } from 'quasar'
import { defineComponent } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import { createMemoryHistory, createRouter } from 'vue-router'
import FederationsPage from 'src/pages/federations/index.vue'
import type { Federation } from 'src/types/federation'

const createMockFederation = (overrides: Partial<Federation> = {}): Federation => ({
  title: 'Test Federation',
  inviteCode: 'fed11test',
  federationId: 'abc123def456',
  modules: [],
  ...overrides,
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
          AddFederationSelection: true,
          DiscoverFederations: true,
          AddFederation: true,
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

  it('returns from preview back to discovery when opened from discovery', async () => {
    const pinia = createTestingPinia({
      initialState: {
        federation: {
          federations: [],
          selectedFederationId: null,
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
      ],
    })

    await router.push('/federations')
    await router.isReady()

    wrapper = mount(FederationsPage, {
      global: {
        plugins: [Quasar, pinia, router],
        stubs: {
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
            emits: ['back'],
            template: `
              <div data-testid="add-federation-stub">
                <div data-testid="add-federation-back-target">{{ backTarget }}</div>
                <button data-testid="add-federation-back-btn" @click="$emit('back')">back</button>
              </div>
            `,
          }),
          QDialog: defineComponent({
            name: 'QDialog',
            props: {
              modelValue: { type: Boolean, required: false, default: false },
            },
            template: '<div v-if="modelValue"><slot /></div>',
          }),
          QPage: defineComponent({
            name: 'QPage',
            template: '<div><slot /></div>',
          }),
          QToolbar: defineComponent({
            name: 'QToolbar',
            template: '<div><slot /></div>',
          }),
          QToolbarTitle: defineComponent({
            name: 'QToolbarTitle',
            template: '<div><slot /></div>',
          }),
          FederationList: true,
          QBtn: defineComponent({
            name: 'QBtn',
            template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
          }),
        },
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(wrapper.vm as any).showDiscover = true
    await flushPromises()

    await wrapper.get('[data-testid="discover-open-preview-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="discover-federations-stub"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="add-federation-back-target"]').text()).toBe('discover')

    await wrapper.get('[data-testid="add-federation-back-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="add-federation-stub"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="discover-federations-stub"]').exists()).toBe(true)
  })
})
