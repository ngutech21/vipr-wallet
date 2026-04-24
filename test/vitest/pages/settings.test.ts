import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import SettingsPage from 'src/pages/settings/index.vue'

type MockRoute = {
  name: string | null
}

const mockRoute: MockRoute = vi.hoisted(() => ({
  name: '/settings/',
}))
const mockRouterReplace = vi.hoisted(() => vi.fn())

const mockCheckForUpdatesManual = vi.hoisted(() => vi.fn())
const mockApplyUpdate = vi.hoisted(() => vi.fn())
const mockCanApplyOnRoute = vi.hoisted(() => vi.fn())
const mockNotifyCreate = vi.hoisted(() => vi.fn())
const mockDialogCreate = vi.hoisted(() => vi.fn(() => ({ onOk: vi.fn() })))

const mockPwaUpdateStore = vi.hoisted(() => ({
  state: 'idle',
  registration: null,
  lastError: null as string | null,
  isUpdateReady: false,
  $reset: vi.fn(),
  canApplyOnRoute: mockCanApplyOnRoute,
  checkForUpdatesManual: mockCheckForUpdatesManual,
  checkForUpdatesStartup: vi.fn(),
  applyUpdate: mockApplyUpdate,
}))

const walletStoreMock = vi.hoisted(() => ({
  clearAllWallets: vi.fn(),
}))

const federationStoreMock = vi.hoisted(() => ({
  $reset: vi.fn(),
}))

const nostrStoreMock = vi.hoisted(() => ({
  relays: [] as string[],
  contactSource: {
    sourceType: 'nip05',
    sourceValue: '',
    resolvedPubkey: null as string | null,
  },
  contacts: [] as Array<{
    pubkey: string
    npub: string
    paymentTarget: string
    displayName?: string
    name?: string
    nip05?: string
    picture?: string
    lud16?: string
    lud06?: string
  }>,
  contactSyncMeta: {
    lastSyncedAt: null as number | null,
    lastSyncError: null as string | null,
  },
  syncStatus: 'idle',
  addRelay: vi.fn(),
  removeRelay: vi.fn(),
  resetRelays: vi.fn(),
  setContactSource: vi.fn(),
  syncContacts: vi.fn(),
  clearContacts: vi.fn(),
  $reset: vi.fn(),
}))

const onboardingStoreMock = vi.hoisted(() => ({
  $reset: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => ({
    replace: mockRouterReplace,
  }),
}))

vi.mock('src/stores/pwa-update', () => ({
  usePwaUpdateStore: () => mockPwaUpdateStore,
}))

vi.mock('src/stores/wallet', () => ({
  useWalletStore: () => walletStoreMock,
}))

vi.mock('src/stores/federation', () => ({
  useFederationStore: () => federationStoreMock,
}))

vi.mock('src/stores/nostr', () => ({
  useNostrStore: () => nostrStoreMock,
}))

vi.mock('src/stores/onboarding', () => ({
  useOnboardingStore: () => onboardingStoreMock,
}))

vi.mock('@getalby/bitcoin-connect', () => ({
  getConnectorConfig: vi.fn(() => ({ connectorName: '' })),
  launchModal: vi.fn(),
  onConnected: vi.fn(),
  onDisconnected: vi.fn(),
}))

vi.mock('quasar', async (importOriginal) => {
  const actual = await importOriginal()
  return Object.assign({}, actual, {
    Notify: {
      create: mockNotifyCreate,
    },
    Dialog: {
      create: mockDialogCreate,
    },
  })
})

const QBtnStub = {
  props: ['label', 'disable', 'loading'],
  emits: ['click'],
  template:
    '<button v-bind="$attrs" :disabled="disable || loading" @click="$emit(\'click\')">{{ label }}</button>',
}

const QInputStub = {
  props: ['modelValue', 'label', 'placeholder'],
  emits: ['update:modelValue'],
  template:
    '<label v-bind="$attrs"><span>{{ label }}</span><input :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" /></label>',
}

const QBtnToggleStub = {
  props: ['modelValue', 'options'],
  emits: ['update:modelValue'],
  template:
    '<div v-bind="$attrs"><button v-for="option in options" :key="option.value" type="button" @click="$emit(\'update:modelValue\', option.value)">{{ option.label }}</button></div>',
}

const SlotStub = {
  template: '<div><slot /></div>',
}

describe('SettingsPage updates', () => {
  function createWrapper() {
    return mount(SettingsPage, {
      global: {
        stubs: {
          transition: false,
          BuildInfo: true,
          'q-page': SlotStub,
          'q-toolbar': SlotStub,
          'q-toolbar-title': SlotStub,
          'q-expansion-item': SlotStub,
          'q-card': SlotStub,
          'q-card-section': SlotStub,
          'q-list': SlotStub,
          'q-item': SlotStub,
          'q-item-section': SlotStub,
          'q-item-label': SlotStub,
          'q-icon': SlotStub,
          'q-input': QInputStub,
          'q-btn-toggle': QBtnToggleStub,
          'q-btn': QBtnStub,
          'q-avatar': SlotStub,
          'q-chip': SlotStub,
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockRoute.name = '/settings/'
    mockPwaUpdateStore.state = 'idle'
    mockPwaUpdateStore.lastError = null
    mockPwaUpdateStore.isUpdateReady = false
    mockCanApplyOnRoute.mockReturnValue(true)
    mockCheckForUpdatesManual.mockResolvedValue('up-to-date')
    mockApplyUpdate.mockResolvedValue('applied')
    mockRouterReplace.mockResolvedValue(undefined)
    mockPwaUpdateStore.$reset = vi.fn()
    nostrStoreMock.contactSource = {
      sourceType: 'nip05',
      sourceValue: '',
      resolvedPubkey: null,
    }
    nostrStoreMock.contacts = []
    nostrStoreMock.contactSyncMeta = {
      lastSyncedAt: null,
      lastSyncError: null,
    }
    nostrStoreMock.syncStatus = 'idle'
    nostrStoreMock.syncContacts.mockResolvedValue(true)
  })

  it('shows check button and triggers manual update check', async () => {
    const wrapper = createWrapper()
    const button = wrapper.find('[data-testid="settings-check-updates-btn"]')

    expect(wrapper.html()).toContain('build-info-stub')
    expect(button.text()).toBe('Check for updates')
    await button.trigger('click')
    await flushPromises()

    expect(mockCheckForUpdatesManual).toHaveBeenCalledTimes(1)
    expect(mockApplyUpdate).not.toHaveBeenCalled()
  })

  it('shows apply button and triggers apply update when update is ready', async () => {
    mockPwaUpdateStore.isUpdateReady = true
    mockPwaUpdateStore.state = 'waiting'
    const wrapper = createWrapper()
    const button = wrapper.find('[data-testid="settings-check-updates-btn"]')

    expect(button.text()).toBe('Update ready')
    await button.trigger('click')
    await flushPromises()

    expect(mockApplyUpdate).toHaveBeenCalledWith('/settings/')
    expect(mockCheckForUpdatesManual).not.toHaveBeenCalled()
  })

  it('shows disallowed route hint and notification when apply is blocked', async () => {
    mockRoute.name = '/send'
    mockPwaUpdateStore.isUpdateReady = true
    mockPwaUpdateStore.state = 'waiting'
    mockCanApplyOnRoute.mockReturnValue(false)
    mockApplyUpdate.mockResolvedValue('blocked-route')

    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('Update is ready. Open Home or Settings to apply safely.')

    await wrapper.find('[data-testid="settings-check-updates-btn"]').trigger('click')
    await flushPromises()

    expect(mockApplyUpdate).toHaveBeenCalledWith('/send')
    expect(mockNotifyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Update is ready. Open Home or Settings to apply safely.',
      }),
    )
  })

  it('shows checking notification when apply triggers background download', async () => {
    mockPwaUpdateStore.isUpdateReady = true
    mockPwaUpdateStore.state = 'waiting'
    mockApplyUpdate.mockResolvedValue('checking')

    const wrapper = createWrapper()
    await wrapper.find('[data-testid="settings-check-updates-btn"]').trigger('click')
    await flushPromises()

    expect(mockNotifyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Update is downloading in the background',
      }),
    )
  })

  it('clears only app-owned local storage keys when deleting data', async () => {
    localStorage.setItem('vipr.federations', '["kept-only-for-reset-test"]')
    localStorage.setItem('vipr.onboarding.state', '{"status":"in_progress"}')
    localStorage.setItem('external.key', 'preserve-me')

    mockDialogCreate.mockImplementationOnce(() => ({
      onOk: vi.fn((callback: () => void | Promise<void>) => {
        return Promise.resolve(callback()).then(() => undefined)
      }),
    }))

    const wrapper = createWrapper()
    await wrapper.find('[data-testid="settings-delete-data-btn"]').trigger('click')
    await flushPromises()

    expect(walletStoreMock.clearAllWallets).toHaveBeenCalledTimes(1)
    expect(federationStoreMock.$reset).toHaveBeenCalledTimes(1)
    expect(nostrStoreMock.$reset).toHaveBeenCalledTimes(1)
    expect(onboardingStoreMock.$reset).toHaveBeenCalledTimes(1)
    expect(mockPwaUpdateStore.$reset).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('external.key')).toBe('preserve-me')
    expect(mockRouterReplace).toHaveBeenCalledWith({ name: '/startup-wizard' })
    expect(mockNotifyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Data deleted successfully',
      }),
    )
  })

  it('syncs contacts from the configured source and renders imported contacts', async () => {
    nostrStoreMock.contactSource = {
      sourceType: 'npub',
      sourceValue: 'npub1example',
      resolvedPubkey: null,
    }
    nostrStoreMock.contacts = [
      {
        pubkey: 'a'.repeat(64),
        npub: 'npub1example',
        paymentTarget: 'alice@getalby.com',
        displayName: 'Alice',
        lud16: 'alice@getalby.com',
      },
    ]

    const wrapper = createWrapper()
    await wrapper.find('[data-testid="settings-sync-contacts-btn"]').trigger('click')
    await flushPromises()

    expect(nostrStoreMock.setContactSource).toHaveBeenCalledWith('npub', 'npub1example')
    expect(nostrStoreMock.syncContacts).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain('1 imported contacts')
  })

  it('shows sync errors and clears imported contacts', async () => {
    nostrStoreMock.contactSyncMeta = {
      lastSyncedAt: null,
      lastSyncError: 'Invalid npub identifier.',
    }

    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('Invalid npub identifier.')

    await wrapper.find('[data-testid="settings-clear-contacts-btn"]').trigger('click')
    await flushPromises()

    expect(nostrStoreMock.clearContacts).toHaveBeenCalledTimes(1)
    expect(mockNotifyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Cleared imported contacts',
      }),
    )
  })

  it('shows contacts incrementally and reveals more on demand', async () => {
    nostrStoreMock.contacts = Array.from({ length: 12 }, (_, index) => ({
      pubkey: `${String(index).padStart(2, '0')}${'a'.repeat(62)}`,
      npub: `npub1contact${index}`,
      paymentTarget: `contact${index}@getalby.com`,
      displayName: `Contact ${index + 1}`,
      lud16: `contact${index}@getalby.com`,
    }))

    const wrapper = createWrapper()

    expect(wrapper.text()).toContain('Showing 10 of 12 contacts')
    expect(wrapper.text()).not.toContain('Contact 11')
    expect(wrapper.text()).not.toContain('Contact 12')

    await wrapper.find('[data-testid="settings-show-more-contacts-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Showing 12 of 12 contacts')
    expect(wrapper.text()).toContain('Contact 11')
    expect(wrapper.text()).toContain('Contact 12')
    expect(wrapper.find('[data-testid="settings-show-more-contacts-btn"]').exists()).toBe(false)
  })
})
