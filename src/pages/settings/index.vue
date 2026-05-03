<template>
  <q-page class="dark-gradient" data-testid="settings-page">
    <div class="settings-page">
      <SettingsGroup title="Security">
        <BackupSettings />
        <AppLockSettings />
      </SettingsGroup>

      <SettingsGroup title="Connections">
        <LightningConnectionSettings />
        <NostrRelaySettings />
        <NostrContactsSettings />
      </SettingsGroup>

      <SettingsGroup title="App">
        <PwaUpdateSettings />
        <ProjectSettings />
      </SettingsGroup>

      <SettingsGroup title="Danger zone">
        <DangerZoneSettings />
      </SettingsGroup>
    </div>
  </q-page>
</template>

<script setup lang="ts">
defineOptions({
  name: 'SettingsPage',
})

import AppLockSettings from 'src/components/settings/AppLockSettings.vue'
import BackupSettings from 'src/components/settings/BackupSettings.vue'
import DangerZoneSettings from 'src/components/settings/DangerZoneSettings.vue'
import LightningConnectionSettings from 'src/components/settings/LightningConnectionSettings.vue'
import NostrContactsSettings from 'src/components/settings/NostrContactsSettings.vue'
import NostrRelaySettings from 'src/components/settings/NostrRelaySettings.vue'
import ProjectSettings from 'src/components/settings/ProjectSettings.vue'
import PwaUpdateSettings from 'src/components/settings/PwaUpdateSettings.vue'
import SettingsGroup from 'src/components/settings/SettingsGroup.vue'
</script>
