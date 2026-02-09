import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, type VueWrapper, flushPromises } from '@vue/test-utils'
import { Quasar, Notify, Loading } from 'quasar'
import { createPinia, setActivePinia } from 'pinia'
import DiscoverFederations from 'src/components/DiscoverFederations.vue'
import { useFederationStore } from 'src/stores/federation'
import { useNostrStore } from 'src/stores/nostr'
import type { Federation } from 'src/components/models'

// Mock factory for creating test federations
const createMockFederation = (overrides: Partial<Federation> = {}): Federation => ({
  title: 'Test Federation',
  inviteCode: 'fed11qgqpw9thwimyd3shxvn4da5mskvkv5w6t40hx8hwcfgezx30raj6n6ju5kfdvfmx06f',
  federationId: 'test-fed-id-123',
  modules: [],
  metadata: {
    federation_icon_url: 'https://example.com/icon.png',
  },
  ...overrides,
})

describe('DiscoverFederations.vue', () => {
  let wrapper: VueWrapper
  let pinia: ReturnType<typeof createPinia>

  // Mock Notify and Loading
  const mockNotify = vi.fn()
  const mockLoadingShow = vi.fn()
  const mockLoadingHide = vi.fn()
  Notify.create = mockNotify
  Loading.show = mockLoadingShow
  Loading.hide = mockLoadingHide

  const createWrapper = (props: { visible?: boolean } = {}): VueWrapper => {
    pinia = createPinia()
    setActivePinia(pinia)

    return mount(DiscoverFederations, {
      props: {
        visible: props.visible ?? false,
      },
      global: {
        plugins: [Quasar, pinia],
        stubs: {
          ModalCard: {
            template: '<div class="modal-card"><slot /></div>',
            props: ['title'],
          },
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    if (wrapper !== undefined) {
      wrapper.unmount()
    }
  })

  describe('Component Mounting & Props', () => {
    it('should mount with visible prop defaulting to false', () => {
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('should mount with visible prop set to true', () => {
      wrapper = createWrapper({ visible: true })
      expect(wrapper.exists()).toBe(true)
    })

    it('should render component with heading text', () => {
      wrapper = createWrapper()
      expect(wrapper.text()).toContain('Available Federations')
    })
  })

  describe('Component Initialization', () => {
    it('should not call discoverFederations on mount when visible is false', async () => {
      const nostrStore = useNostrStore()
      const spy = vi.spyOn(nostrStore, 'discoverFederations')

      wrapper = createWrapper({ visible: false })
      await flushPromises()

      expect(spy).not.toHaveBeenCalled()
    })

    it('should stop discovery when visible changes to false', async () => {
      wrapper = createWrapper({ visible: true })
      await flushPromises()
      const nostrStore = useNostrStore()
      const stopSpy = vi.spyOn(nostrStore, 'stopDiscoveringFederations')

      await wrapper.setProps({ visible: false })
      await flushPromises()

      expect(stopSpy).toHaveBeenCalled()
    })
  })

  describe('Federation List Display', () => {
    it('should display empty state when no federations discovered', () => {
      wrapper = createWrapper()
      const list = wrapper.find('q-list-stub')
      expect(list.exists()).toBe(false)
    })

    it('should display list when federations are discovered', async () => {
      wrapper = createWrapper()
      const nostrStore = useNostrStore()
      nostrStore.discoveredFederations = [createMockFederation()]
      await flushPromises()

      expect(wrapper.text()).toContain('Test Federation')
    })

    it('should display multiple federations', async () => {
      wrapper = createWrapper()
      const nostrStore = useNostrStore()
      nostrStore.discoveredFederations = [
        createMockFederation({ title: 'Federation 1', federationId: 'fed-1' }),
        createMockFederation({ title: 'Federation 2', federationId: 'fed-2' }),
        createMockFederation({ title: 'Federation 3', federationId: 'fed-3' }),
      ]
      await flushPromises()

      expect(wrapper.text()).toContain('Federation 1')
      expect(wrapper.text()).toContain('Federation 2')
      expect(wrapper.text()).toContain('Federation 3')
    })

    it('should display federation title and ID', async () => {
      wrapper = createWrapper()
      const nostrStore = useNostrStore()
      nostrStore.discoveredFederations = [
        createMockFederation({
          title: 'My Federation',
          federationId: 'my-fed-id-123',
        }),
      ]
      await flushPromises()

      expect(wrapper.text()).toContain('My Federation')
      expect(wrapper.text()).toContain('my-fed-id-123')
    })
  })

  describe('Loading State', () => {
    it('should not show loading spinner when not discovering', async () => {
      wrapper = createWrapper()
      const nostrStore = useNostrStore()
      nostrStore.isDiscoveringFederations = false
      await flushPromises()

      expect(wrapper.find('q-spinner-stub').exists()).toBe(false)
    })

    it('should hide loading text when not discovering', async () => {
      wrapper = createWrapper()
      const nostrStore = useNostrStore()
      nostrStore.isDiscoveringFederations = false
      nostrStore.discoveredFederations = []
      await flushPromises()

      expect(wrapper.text()).not.toContain('Searching...')
    })
  })

  describe('Add Federation', () => {
    it('should add and select federation successfully, then emit close', async () => {
      const federation = createMockFederation()
      wrapper = createWrapper()
      const federationStore = useFederationStore()
      const nostrStore = useNostrStore()
      const addSpy = vi.spyOn(federationStore, 'addFederation')
      const selectSpy = vi.spyOn(federationStore, 'selectFederation').mockResolvedValue()
      const stopSpy = vi.spyOn(nostrStore, 'stopDiscoveringFederations')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const component = wrapper.vm as any
      await component.addFederation(federation)
      await flushPromises()

      expect(addSpy).toHaveBeenCalledWith(federation)
      expect(selectSpy).toHaveBeenCalledWith(federation)
      expect(stopSpy).toHaveBeenCalledTimes(1)
      expect(wrapper.emitted('close')).toHaveLength(1)
      expect(mockNotify).toHaveBeenCalledWith({
        message: 'Federation added successfully',
        color: 'positive',
        icon: 'check',
        position: 'top',
        timeout: 3000,
      })
      expect(mockLoadingHide).toHaveBeenCalled()
    })

    it('should show error notification when federation already exists', async () => {
      const federation = createMockFederation()
      wrapper = createWrapper()
      const nostrStore = useNostrStore()
      const federationStore = useFederationStore()
      nostrStore.discoveredFederations = [federation]
      federationStore.federations = [federation]
      await flushPromises()

      // Call addFederation directly since item is disabled
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const component = wrapper.vm as any
      await component.addFederation(federation)
      await flushPromises()

      expect(mockNotify).toHaveBeenCalledWith({
        message: 'Federation already exists',
        color: 'negative',
        icon: 'error',
        timeout: 5000,
        position: 'top',
      })
    })

    it('should not emit close when federation already exists', async () => {
      const federation = createMockFederation()
      wrapper = createWrapper()
      const nostrStore = useNostrStore()
      const federationStore = useFederationStore()
      nostrStore.discoveredFederations = [federation]
      federationStore.federations = [federation]
      await flushPromises()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const component = wrapper.vm as any
      await component.addFederation(federation)
      await flushPromises()

      expect(wrapper.emitted('close')).toBeFalsy()
    })

    it('should show error notification when selecting federation fails', async () => {
      const federation = createMockFederation()
      wrapper = createWrapper()
      const federationStore = useFederationStore()
      federationStore.federations = []
      vi.spyOn(federationStore, 'selectFederation').mockRejectedValue(new Error('select failed'))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const component = wrapper.vm as any
      await component.addFederation(federation)
      await flushPromises()

      expect(mockNotify).toHaveBeenCalledWith({
        message: 'Failed to add federation: select failed',
        color: 'negative',
        icon: 'error',
        timeout: 5000,
        position: 'top',
      })
      expect(wrapper.emitted('close')).toBeFalsy()
      expect(mockLoadingHide).toHaveBeenCalled()
    })
  })

  describe('Discovery Error Handling', () => {
    it('should notify when discoverFederations fails', async () => {
      wrapper = createWrapper()
      const nostrStore = useNostrStore()
      vi.spyOn(nostrStore, 'discoverFederations').mockRejectedValue(new Error('boom'))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const component = wrapper.vm as any
      await component.discoverFederations()

      expect(mockNotify).toHaveBeenCalledWith({
        message: 'Failed to discover federations boom',
        color: 'negative',
        icon: 'error',
        position: 'top',
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle federations without metadata', async () => {
      wrapper = createWrapper()
      const nostrStore = useNostrStore()
      const { metadata: _, ...fedWithoutMetadata } = createMockFederation()
      nostrStore.discoveredFederations = [fedWithoutMetadata as Federation]
      await flushPromises()

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.text()).toContain('Test Federation')
    })

    it('should handle federations with empty metadata', async () => {
      wrapper = createWrapper()
      const nostrStore = useNostrStore()
      nostrStore.discoveredFederations = [
        createMockFederation({
          metadata: {},
        }),
      ]
      await flushPromises()

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.text()).toContain('Test Federation')
    })

    it('should handle federations with empty title', async () => {
      wrapper = createWrapper()
      const nostrStore = useNostrStore()
      nostrStore.discoveredFederations = [
        createMockFederation({
          title: '',
        }),
      ]
      await flushPromises()

      expect(wrapper.exists()).toBe(true)
    })

    it('should handle federations with very long titles', async () => {
      const longTitle = 'A'.repeat(200)
      wrapper = createWrapper()
      const nostrStore = useNostrStore()
      nostrStore.discoveredFederations = [
        createMockFederation({
          title: longTitle,
        }),
      ]
      await flushPromises()

      expect(wrapper.text()).toContain(longTitle)
    })

    it('should handle federations with very long IDs', async () => {
      const longId = `fed-${'a'.repeat(200)}`
      wrapper = createWrapper()
      const nostrStore = useNostrStore()
      nostrStore.discoveredFederations = [
        createMockFederation({
          federationId: longId,
        }),
      ]
      await flushPromises()

      expect(wrapper.text()).toContain(longId)
    })

    it('should handle empty discovered federations array', async () => {
      wrapper = createWrapper()
      const nostrStore = useNostrStore()
      nostrStore.discoveredFederations = []
      await flushPromises()

      const list = wrapper.find('q-list-stub')
      expect(list.exists()).toBe(false)
    })
  })

  describe('isAdded Helper Function', () => {
    it('should return true when federation is in store', async () => {
      const federation = createMockFederation()
      wrapper = createWrapper()
      const federationStore = useFederationStore()
      federationStore.federations = [federation]
      await flushPromises()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const component = wrapper.vm as any
      expect(component.isAdded(federation)).toBe(true)
    })

    it('should return false when federation is not in store', async () => {
      const federation = createMockFederation()
      wrapper = createWrapper()
      const federationStore = useFederationStore()
      federationStore.federations = []
      await flushPromises()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const component = wrapper.vm as any
      expect(component.isAdded(federation)).toBe(false)
    })

    it('should return false when federation has different ID', async () => {
      const federation1 = createMockFederation({ federationId: 'fed-1' })
      const federation2 = createMockFederation({ federationId: 'fed-2' })
      wrapper = createWrapper()
      const federationStore = useFederationStore()
      federationStore.federations = [federation2]
      await flushPromises()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const component = wrapper.vm as any
      expect(component.isAdded(federation1)).toBe(false)
    })
  })

  describe('Unmount Cleanup', () => {
    it('should stop discovery on unmount', async () => {
      wrapper = createWrapper()
      await flushPromises()
      const nostrStore = useNostrStore()
      const stopSpy = vi.spyOn(nostrStore, 'stopDiscoveringFederations')

      wrapper.unmount()

      expect(stopSpy).toHaveBeenCalled()
    })
  })
})
