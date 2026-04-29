<template>
  <q-page class="dark-gradient" data-testid="settings-page">
    <div class="settings-page">
      <div class="settings-stack settings-stack--primary">
        <LightningConnectionSettings />
        <NostrRelaySettings />
        <NostrContactsSettings />
      </div>

      <div class="settings-stack settings-stack--secondary">
        <PwaUpdateSettings />
        <BackupSettings />
        <AppLockSettings />
        <ProjectSettings />
        <DangerZoneSettings />
      </div>
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
</script>
