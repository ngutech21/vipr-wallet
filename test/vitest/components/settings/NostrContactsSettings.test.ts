import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import NostrContactsSettings from 'src/components/settings/NostrContactsSettings.vue'

const mockNotifyCreate = vi.hoisted(() => vi.fn())

const nostrStoreMock = vi.hoisted(() => ({
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
  setContactSource: vi.fn(),
  syncContacts: vi.fn(),
  clearContacts: vi.fn(),
}))

vi.mock('src/stores/nostr', () => ({
  useNostrStore: () => nostrStoreMock,
}))

vi.mock('quasar', async (importOriginal) => {
  const actual = await importOriginal()
  return Object.assign({}, actual, {
    Notify: {
      create: mockNotifyCreate,
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

const SlotStub = {
  template: '<div><slot /></div>',
}

describe('NostrContactsSettings', () => {
  function createWrapper() {
    return mount(NostrContactsSettings, {
      global: {
        stubs: {
          SettingsSection: SlotStub,
          'q-list': SlotStub,
          'q-item': SlotStub,
          'q-item-section': SlotStub,
          'q-item-label': SlotStub,
          'q-avatar': SlotStub,
          'q-icon': SlotStub,
          'q-input': QInputStub,
          'q-btn': QBtnStub,
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
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

    expect(nostrStoreMock.setContactSource).toHaveBeenCalledWith('npub1example')
    expect(nostrStoreMock.syncContacts).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain('1 imported contacts')
  })

  it('shows sync errors and clears imported contacts', async () => {
    nostrStoreMock.contactSyncMeta = {
      lastSyncedAt: null,
      lastSyncError: 'Enter a valid Nostr identifier.',
    }

    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('Enter a valid Nostr identifier.')

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
