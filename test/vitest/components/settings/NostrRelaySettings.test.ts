import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import NostrRelaySettings from 'src/components/settings/NostrRelaySettings.vue'

const mockNotifyCreate = vi.hoisted(() => vi.fn())

const nostrStoreMock = vi.hoisted(() => ({
  relays: [] as string[],
  addRelay: vi.fn(),
  removeRelay: vi.fn(),
  resetRelays: vi.fn(),
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
  props: ['label', 'disable'],
  emits: ['click'],
  template:
    '<button v-bind="$attrs" :disabled="disable" @click="$emit(\'click\')">{{ label }}<slot /></button>',
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

describe('NostrRelaySettings', () => {
  function createWrapper() {
    return mount(NostrRelaySettings, {
      global: {
        stubs: {
          SettingsSection: SlotStub,
          'q-list': SlotStub,
          'q-item': SlotStub,
          'q-item-section': SlotStub,
          'q-item-label': SlotStub,
          'q-input': QInputStub,
          'q-btn': QBtnStub,
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    nostrStoreMock.relays = ['wss://relay.example']
    nostrStoreMock.addRelay.mockResolvedValue(true)
    nostrStoreMock.removeRelay.mockResolvedValue(true)
    nostrStoreMock.resetRelays.mockResolvedValue(undefined)
  })

  it('adds a valid relay', async () => {
    const wrapper = createWrapper()

    await wrapper
      .find('[data-testid="settings-new-relay-input"] input')
      .setValue('wss://new.example')
    await wrapper.find('[data-testid="settings-add-relay-btn"]').trigger('click')
    await flushPromises()

    expect(nostrStoreMock.addRelay).toHaveBeenCalledWith('wss://new.example')
    expect(mockNotifyCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Added relay: wss://new.example',
      }),
    )
  })

  it('removes and resets relays', async () => {
    const wrapper = createWrapper()

    await wrapper.find('[data-testid="settings-remove-relay-btn-0"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-testid="settings-reset-relays-btn"]').trigger('click')
    await flushPromises()

    expect(nostrStoreMock.removeRelay).toHaveBeenCalledWith('wss://relay.example')
    expect(nostrStoreMock.resetRelays).toHaveBeenCalledTimes(1)
  })
})
