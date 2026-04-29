<template>
  <SettingsSection
    variant="danger"
    icon="warning"
    label="Reset"
    caption="Clear local data"
    expand-icon-class="text-negative"
  >
    <div class="settings-copy-block settings-block">
      Deleting all data will remove your wallet connections, federations and all settings. This
      cannot be undone.
    </div>
    <q-btn
      label="Delete ALL Data"
      color="negative"
      icon="delete"
      no-caps
      unelevated
      @click="deleteData"
      class="settings-action-full"
      data-testid="settings-delete-data-btn"
    />
  </SettingsSection>
</template>

<script setup lang="ts">
defineOptions({
  name: 'DangerZoneSettings',
})

import { Dialog } from 'quasar'
import { useRouter } from 'vue-router'
import SettingsSection from 'src/components/settings/SettingsSection.vue'
import { useAppNotify } from 'src/composables/useAppNotify'
import { logger } from 'src/services/logger'
import { useAppLockStore } from 'src/stores/app-lock'
import { useFederationStore } from 'src/stores/federation'
import { useNostrStore } from 'src/stores/nostr'
import { useOnboardingStore } from 'src/stores/onboarding'
import { usePwaUpdateStore } from 'src/stores/pwa-update'
import { useWalletStore } from 'src/stores/wallet'

const APP_LOCAL_STORAGE_PREFIX = 'vipr.'

const walletStore = useWalletStore()
const federationStore = useFederationStore()
const nostrStore = useNostrStore()
const onboardingStore = useOnboardingStore()
const pwaUpdateStore = usePwaUpdateStore()
const appLockStore = useAppLockStore()
const router = useRouter()
const notify = useAppNotify()

function clearAppLocalStorage() {
  if (typeof localStorage === 'undefined') {
    return
  }

  const keysToRemove: string[] = []
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (key != null && key.startsWith(APP_LOCAL_STORAGE_PREFIX)) {
      keysToRemove.push(key)
    }
  }

  for (const key of keysToRemove) {
    localStorage.removeItem(key)
  }
}

function deleteData() {
  logger.ui.debug('User initiated data deletion')
  Dialog.create({
    title: 'Delete Data',
    message: 'Are you sure you want to delete all data?',
    persistent: true,
    ok: { label: 'Delete', color: 'negative' },
    cancel: true,
  }).onOk(() => {
    clearLocalAndWalletData().catch((error) => {
      logger.error('Failed to clear local and wallet data', error)
    })
  })
}

async function clearLocalAndWalletData() {
  await walletStore.clearAllWallets()
  appLockStore.clearAll()
  clearAppLocalStorage()
  federationStore.$reset()
  nostrStore.$reset()
  onboardingStore.$reset()
  pwaUpdateStore.$reset()
  notify.success('Data deleted successfully')
  await router.replace({ name: '/startup-wizard' })
}
</script>
