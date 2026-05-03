<template>
  <SettingsRow
    icon="shield"
    label="Backup"
    caption="Recovery phrase"
    :status="backupStatusLabel"
    :status-tone="backupStatusTone"
    :to="{ name: '/settings/backup' }"
    data-testid="settings-personal-backup-section"
  />
</template>

<script setup lang="ts">
defineOptions({
  name: 'BackupSettings',
})

import { computed } from 'vue'
import SettingsRow from 'src/components/settings/SettingsRow.vue'
import { useWalletStore } from 'src/stores/wallet'

const walletStore = useWalletStore()
const backupStatusLabel = computed(() => {
  if (!walletStore.hasMnemonic) {
    return 'No wallet'
  }

  return walletStore.needsMnemonicBackup ? 'Not backed up' : 'Backed up'
})
const backupStatusTone = computed(() => (walletStore.needsMnemonicBackup ? 'warning' : 'positive'))
</script>
