<template>
  <SettingsSection variant="secondary">
    <template #header>
      <q-item-section avatar>
        <q-icon name="shield" />
      </q-item-section>
      <q-item-section data-testid="settings-personal-backup-section">
        <q-item-label>Backup</q-item-label>
        <q-item-label caption>Save recovery phrase</q-item-label>
      </q-item-section>
    </template>
    <div class="settings-copy-block settings-block">
      Create a backup of your wallet using your recovery phrase. Write it down and store it safely
      to recover your wallet if you lose access to this device.
    </div>
    <q-btn
      label="Create backup"
      color="primary"
      icon="backup"
      no-caps
      unelevated
      :to="{ name: '/settings/backup' }"
      class="settings-action-full"
      data-testid="settings-create-backup-btn"
    />
  </SettingsSection>
</template>

<script setup lang="ts">
defineOptions({
  name: 'BackupSettings',
})

import SettingsSection from 'src/components/settings/SettingsSection.vue'
</script>
