import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SettingsPage from 'src/pages/settings/index.vue'

const SlotStub = {
  template: '<div><slot /></div>',
}

describe('SettingsPage', () => {
  it('renders the settings sections in page layout', () => {
    const wrapper = mount(SettingsPage, {
      global: {
        stubs: {
          'q-page': SlotStub,
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
    expect(wrapper.findAll('.settings-stack')).toHaveLength(2)
    expect(wrapper.find('[data-testid="lightning-settings-stub"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="danger-zone-settings-stub"]').exists()).toBe(true)
  })
})
