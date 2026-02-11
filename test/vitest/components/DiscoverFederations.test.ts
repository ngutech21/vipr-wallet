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

    it('should render discovery status with start action when idle', () => {
      wrapper = createWrapper()
      expect(wrapper.text()).toContain('0 loaded, updates paused')
      expect(wrapper.text()).toContain('Start')
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

    it('should show recommendation count when available', async () => {
      wrapper = createWrapper()
      const nostrStore = useNostrStore()
      nostrStore.discoveredFederations = [
        createMockFederation({
          title: 'Recommended Federation',
          federationId: 'recommended-fed-id',
          inviteCode: 'invite-recommended',
        }),
      ]
      nostrStore.discoveryCandidates = [
        {
          federationId: 'recommended-fed-id',
          inviteCode: 'invite-recommended',
          createdAt: 1,
          recommendationCount: 3,
        },
      ]
      await flushPromises()

      expect(wrapper.text()).toContain('Recommended by 3 users')
    })

    it('should prioritize ready federations over loading placeholders', async () => {
      wrapper = createWrapper()
      const nostrStore = useNostrStore()
      nostrStore.previewTargetCount = 2
      nostrStore.discoveryCandidates = [
        {
          federationId: 'loading-fed-1',
          inviteCode: 'invite-loading-1',
          createdAt: 3,
          recommendationCount: 9,
        },
        {
          federationId: 'loading-fed-2',
          inviteCode: 'invite-loading-2',
          createdAt: 2,
          recommendationCount: 8,
        },
        {
          federationId: 'ready-fed',
          inviteCode: 'invite-ready',
          createdAt: 1,
          recommendationCount: 7,
        },
      ]
      nostrStore.discoveredFederations = [
        createMockFederation({
          title: 'Joinable Federation',
          federationId: 'ready-fed',
          inviteCode: 'invite-ready',
        }),
      ]
      await flushPromises()

      expect(wrapper.text()).toContain('Joinable Federation')
      expect(wrapper.text()).toContain('Loading federation details...')
    })

    it('should show unavailable state instead of loading spinner for failed candidate', async () => {
      wrapper = createWrapper()
      const nostrStore = useNostrStore()
      nostrStore.discoveryCandidates = [
        {
          federationId: 'failed-fed-id',
          inviteCode: 'invite-failed',
          createdAt: 1,
        },
      ]
      nostrStore.previewStatusByFederation = {
        'failed-fed-id': 'failed',
      }
      await flushPromises()

      expect(wrapper.text()).toContain('Federation details unavailable.')
      expect(wrapper.text()).not.toContain('Loading federation details...')
    })

    it('should only show federations up to preview target count', async () => {
      wrapper = createWrapper()
      const nostrStore = useNostrStore()
      nostrStore.previewTargetCount = 10
      nostrStore.discoveredFederations = [
        createMockFederation({ title: 'Federation 1', federationId: 'fed-1' }),
        createMockFederation({ title: 'Federation 2', federationId: 'fed-2' }),
      ]
      nostrStore.previewTargetCount = 1
      await flushPromises()

      expect(wrapper.text()).toContain('Federation 1')
      expect(wrapper.text()).not.toContain('Federation 2')
    })
  })

  describe('Loading State', () => {
    it('should show initial searching state when discovering and no results are loaded yet', async () => {
      wrapper = createWrapper()
      const nostrStore = useNostrStore()
      nostrStore.isDiscoveringFederations = true
      nostrStore.discoveredFederations = []
      nostrStore.discoveryCandidates = []
      await flushPromises()

      expect(wrapper.text()).toContain('Searching...')
      expect(wrapper.text()).toContain('0 loaded, live updates on')
      expect(wrapper.text()).toContain('Stop')
    })

    it('should show live status and stop action when discovering with loaded results', async () => {
      wrapper = createWrapper()
      const nostrStore = useNostrStore()
      nostrStore.isDiscoveringFederations = true
      nostrStore.discoveredFederations = [createMockFederation({ federationId: 'fed-1' })]
      await flushPromises()

      expect(wrapper.text()).toContain('1 loaded, live updates on')
      expect(wrapper.text()).toContain('Stop')
      expect(wrapper.text()).not.toContain('Searching...')
    })

    it('should stop discovery when stop action is triggered', async () => {
      wrapper = createWrapper()
      const nostrStore = useNostrStore()
      nostrStore.isDiscoveringFederations = true
      nostrStore.discoveredFederations = [createMockFederation({ federationId: 'fed-1' })]
      const stopSpy = vi.spyOn(nostrStore, 'stopDiscoveringFederations')
      await flushPromises()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const component = wrapper.vm as any
      component.toggleDiscovery()
      await flushPromises()

      expect(stopSpy).toHaveBeenCalled()
      expect(wrapper.text()).toContain('Start')
    })

    it('should restart discovery when start action is triggered', async () => {
      wrapper = createWrapper()
      const nostrStore = useNostrStore()
      nostrStore.isDiscoveringFederations = false
      const discoverSpy = vi.spyOn(nostrStore, 'discoverFederations').mockResolvedValue()
      await flushPromises()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const component = wrapper.vm as any
      component.toggleDiscovery()
      await flushPromises()

      expect(discoverSpy).toHaveBeenCalledWith({ reset: false })
    })

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

  describe('Paging Controls', () => {
    it('should show load more button when there are more candidates than visible target', async () => {
      wrapper = createWrapper()
      const nostrStore = useNostrStore()
      nostrStore.previewTargetCount = 10
      nostrStore.discoveryCandidates = Array.from({ length: 12 }, (_, index) => ({
        federationId: `fed-${index}`,
        inviteCode: `invite-${index}`,
        createdAt: index,
      }))
      await flushPromises()

      expect(wrapper.text()).toContain('Load more')
    })

    it('should increase preview target when loading more federations', async () => {
      wrapper = createWrapper()
      const nostrStore = useNostrStore()
      nostrStore.previewTargetCount = 10
      nostrStore.discoveryCandidates = Array.from({ length: 12 }, (_, index) => ({
        federationId: `fed-${index}`,
        inviteCode: `invite-${index}`,
        createdAt: index,
      }))
      await flushPromises()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const component = wrapper.vm as any
      const initialTarget = nostrStore.previewTargetCount
      component.loadMoreFederations()
      await flushPromises()

      expect(nostrStore.previewTargetCount).toBeGreaterThan(initialTarget)
    })
  })

  describe('Add Federation', () => {
    it('should add and select federation successfully without stopping discovery', async () => {
      const federation = createMockFederation()
      wrapper = createWrapper()
      const federationStore = useFederationStore()
      const nostrStore = useNostrStore()
      const addSpy = vi.spyOn(federationStore, 'addFederation')
      const selectSpy = vi.spyOn(federationStore, 'selectFederation').mockResolvedValue()
      const stopSpy = vi.spyOn(nostrStore, 'stopDiscoveringFederations')
      const joinSpy = vi.spyOn(nostrStore, 'setJoinInProgress')
      const idleSpy = vi.spyOn(nostrStore, 'waitForPreviewQueueIdle').mockResolvedValue(true)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const component = wrapper.vm as any
      await component.addFederation(federation)
      await flushPromises()

      expect(addSpy).toHaveBeenCalledWith(federation)
      expect(selectSpy).toHaveBeenCalledWith(federation)
      expect(stopSpy).not.toHaveBeenCalled()
      expect(joinSpy).toHaveBeenNthCalledWith(1, true)
      expect(joinSpy).toHaveBeenLastCalledWith(false)
      expect(idleSpy).toHaveBeenCalled()
      expect(wrapper.emitted('close')).toBeFalsy()
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
      const deleteSpy = vi.spyOn(federationStore, 'deleteFederation')

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
      expect(deleteSpy).toHaveBeenCalledWith(federation.federationId)
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
