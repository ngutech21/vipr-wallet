import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, type VueWrapper, flushPromises } from '@vue/test-utils'
import { Quasar, Notify, Loading } from 'quasar'
import { createPinia, setActivePinia } from 'pinia'
import DiscoverFederations from 'src/components/DiscoverFederations.vue'
import { useFederationStore } from 'src/stores/federation'
import { useNostrStore } from 'src/stores/nostr'

type DiscoveryCandidate = {
  federationId: string
  inviteCode: string
  createdAt: number
  displayName?: string
  about?: string
  pictureUrl?: string
  recommendationCount?: number
}

function createCandidate(overrides: Partial<DiscoveryCandidate> = {}): DiscoveryCandidate {
  return {
    federationId: 'test-fed-id-123',
    inviteCode: 'fed11qgqpw9thwimyd3shxvn4da5mskvkv5w6t40hx8hwcfgezx30raj6n6ju5kfdvfmx06f',
    createdAt: 1,
    displayName: 'Test Federation',
    about: 'Fast private payments',
    pictureUrl: 'https://example.com/icon.png',
    recommendationCount: 3,
    ...overrides,
  }
}

describe('DiscoverFederations.vue', () => {
  let wrapper: VueWrapper | undefined
  let pinia: ReturnType<typeof createPinia>

  const mockNotify = vi.fn()
  const mockLoadingShow = vi.fn()
  const mockLoadingHide = vi.fn()
  Notify.create = mockNotify
  Loading.show = mockLoadingShow
  Loading.hide = mockLoadingHide

  function createWrapper(props: { visible?: boolean } = {}) {
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
    wrapper?.unmount()
    wrapper = undefined
  })

  it('does not start discovery on mount when hidden', async () => {
    wrapper = createWrapper({ visible: false })
    const nostrStore = useNostrStore()
    const discoverSpy = vi.spyOn(nostrStore, 'discoverFederations')
    await flushPromises()

    expect(discoverSpy).not.toHaveBeenCalled()
  })

  it('renders candidates using discovery event data only', async () => {
    wrapper = createWrapper()
    const nostrStore = useNostrStore()
    nostrStore.discoveryCandidates = [
      createCandidate(),
      createCandidate({
        federationId: 'fed-2',
        inviteCode: 'invite-2',
        displayName: 'Orange Club Africa',
        recommendationCount: 56,
      }),
    ]
    await flushPromises()

    expect(wrapper.text()).toContain('Test Federation')
    expect(wrapper.text()).toContain('Fast private payments')
    expect(wrapper.text()).toContain('Recommended by 3 users')
    expect(wrapper.text()).toContain('Orange Club Africa')
    expect(wrapper.text()).not.toContain('Loading federation details...')
    expect(wrapper.text()).not.toContain('guardians')
    expect(wrapper.text()).not.toContain('modules')
  })

  it('falls back to a truncated federation id when no display name exists', async () => {
    wrapper = createWrapper()
    const nostrStore = useNostrStore()
    nostrStore.discoveryCandidates = [
      {
        federationId: 'b21068c84f5b12ca4fdf93f3e443d3bd7c27e8642d0d52ea2e4dce6fdbbee9df',
        inviteCode: 'fed11qgqpw9thwimyd3shxvn4da5mskvkv5w6t40hx8hwcfgezx30raj6n6ju5kfdvfmx06f',
        createdAt: 1,
        recommendationCount: 0,
      },
    ]
    await flushPromises()

    expect(wrapper.text()).toContain('Federation b21068...e9df')
  })

  it('shows searching state when discovery is active and no candidates are loaded', async () => {
    wrapper = createWrapper()
    const nostrStore = useNostrStore()
    nostrStore.isDiscoveringFederations = true
    nostrStore.discoveryCandidates = []
    await flushPromises()

    expect(wrapper.text()).toContain('Searching...')
    expect(wrapper.text()).toContain('0 loaded, live updates on')
    expect(wrapper.text()).toContain('Stop')
  })

  it('shows empty state without the list when discovery is idle and no candidates exist', async () => {
    wrapper = createWrapper()
    const nostrStore = useNostrStore()
    nostrStore.isDiscoveringFederations = false
    nostrStore.discoveryCandidates = []
    await flushPromises()

    expect(wrapper.text()).toContain('No federations discovered yet.')
    expect(wrapper.find('q-list-stub').exists()).toBe(false)
  })

  it('uses the number of discovered candidates for the footer count', async () => {
    wrapper = createWrapper()
    const nostrStore = useNostrStore()
    nostrStore.isDiscoveringFederations = true
    nostrStore.discoveryCandidates = [
      createCandidate(),
      createCandidate({
        federationId: 'fed-2',
        inviteCode: 'invite-2',
      }),
    ]
    await flushPromises()

    expect(wrapper.text()).toContain('2 loaded, live updates on')
  })

  it('shows load more when more candidates are available than visible', async () => {
    wrapper = createWrapper()
    const nostrStore = useNostrStore()
    nostrStore.previewTargetCount = 5
    nostrStore.discoveryCandidates = Array.from({ length: 7 }, (_, index) =>
      createCandidate({
        federationId: `fed-${index}`,
        inviteCode: `invite-${index}`,
        createdAt: index + 1,
        displayName: `Federation ${index + 1}`,
      }),
    )
    await flushPromises()

    expect(wrapper.text()).toContain('Load more')
  })

  it('increases the visible target when load more is triggered', async () => {
    wrapper = createWrapper()
    const nostrStore = useNostrStore()
    nostrStore.previewTargetCount = 5
    nostrStore.discoveryCandidates = Array.from({ length: 7 }, (_, index) =>
      createCandidate({
        federationId: `fed-${index}`,
        inviteCode: `invite-${index}`,
        createdAt: index + 1,
      }),
    )
    await flushPromises()

    const initialTarget = nostrStore.previewTargetCount
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(wrapper.vm as any).loadMoreFederations()
    await flushPromises()

    expect(nostrStore.previewTargetCount).toBeGreaterThan(initialTarget)
  })

  it('emits invite code only when preview is opened', async () => {
    wrapper = createWrapper()
    const candidate = createCandidate()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(wrapper.vm as any).openFederationPreview(candidate)
    await flushPromises()

    expect(wrapper.emitted('close')).toEqual([[]])
    expect(wrapper.emitted('showAdd')).toEqual([[{ inviteCode: candidate.inviteCode }]])
  })

  it('does not open preview for federations that already exist', async () => {
    wrapper = createWrapper()
    const candidate = createCandidate()
    const federationStore = useFederationStore()
    federationStore.federations = [
      {
        title: candidate.displayName ?? 'Existing Federation',
        inviteCode: candidate.inviteCode,
        federationId: candidate.federationId,
        modules: [],
        metadata: {},
      },
    ]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(wrapper.vm as any).openFederationPreview(candidate)
    await flushPromises()

    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Federation already exists',
        color: 'negative',
        icon: 'error',
        position: 'top',
      }),
    )
    expect(wrapper.emitted('close')).toBeFalsy()
    expect(wrapper.emitted('showAdd')).toBeFalsy()
  })

  it('notifies when discovery fails', async () => {
    wrapper = createWrapper()
    const nostrStore = useNostrStore()
    vi.spyOn(nostrStore, 'discoverFederations').mockRejectedValue(new Error('boom'))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wrapper.vm as any).discoverFederations()

    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Failed to discover federations boom',
        color: 'negative',
        icon: 'error',
        position: 'top',
      }),
    )
  })
})
