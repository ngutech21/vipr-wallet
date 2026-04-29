<template>
  <q-expansion-item
    class="settings-section settings-section--secondary"
    header-class="settings-header"
    expand-icon-class="text-primary"
  >
    <template #header>
      <q-item-section avatar>
        <q-icon name="shield" />
      </q-item-section>
      <q-item-section data-testid="settings-personal-backup-section">
        <q-item-label>Backup</q-item-label>
        <q-item-label caption>Save recovery phrase</q-item-label>
      </q-item-section>
    </template>
    <q-card>
      <q-card-section class="settings-panel settings-panel--secondary">
        <div class="settings-copy-block settings-block">
          Create a backup of your wallet using your recovery phrase. Write it down and store it
          safely to recover your wallet if you lose access to this device.
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
      </q-card-section>
    </q-card>
  </q-expansion-item>
</template>

<script setup lang="ts">
defineOptions({
  name: 'BackupSettings',
})
</script>
