import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SettingsPage from 'src/pages/settings/index.vue'

const SlotStub = {
  template: '<div><slot /></div>',
}

const SettingsGroupStub = {
  props: ['title', 'caption'],
  template:
    '<section class="settings-group" :data-title="title"><div class="settings-group__title">{{ title }}</div><slot /></section>',
}

describe('SettingsPage', () => {
  it('renders the settings sections in page layout', () => {
    const wrapper = mount(SettingsPage, {
      global: {
        stubs: {
          'q-page': SlotStub,
          SettingsGroup: SettingsGroupStub,
          LightningConnectionSettings: {
            template: '<section data-testid="lightning-settings-stub" />',
          },
          NostrRelaySettings: {
            template: '<section data-testid="nostr-relay-settings-stub" />',
          },
          NostrContactsSettings: {
            template: '<section data-testid="nostr-contacts-settings-stub" />',
          },
          PwaUpdateSettings: {
            template: '<section data-testid="pwa-update-settings-stub" />',
          },
          BackupSettings: {
            template: '<section data-testid="backup-settings-stub" />',
          },
          AppLockSettings: {
            template: '<section data-testid="app-lock-settings-stub" />',
          },
          ProjectSettings: {
            template: '<section data-testid="project-settings-stub" />',
          },
          DangerZoneSettings: {
            template: '<section data-testid="danger-zone-settings-stub" />',
          },
        },
      },
    })

    expect(wrapper.find('[data-testid="settings-page"]').exists()).toBe(true)
    expect(wrapper.findAll('.settings-group')).toHaveLength(4)
    expect(wrapper.find('[data-title="Security"]').exists()).toBe(true)
    expect(wrapper.find('[data-title="Danger zone"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="lightning-settings-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="danger-zone-settings-stub"]').exists()).toBe(true)
  })
})
