<template>
  <div class="settings-danger-panel" data-testid="settings-danger-zone">
    <div class="settings-danger-panel__body">
      <div class="settings-danger-panel__icon">
        <q-icon name="warning" />
      </div>
      <div class="settings-danger-panel__copy">
        <div class="settings-danger-panel__title">Reset local wallet data</div>
        <div class="settings-danger-panel__caption">
          Clears federations, wallet connections, contacts and settings on this device.
        </div>
      </div>
    </div>
    <q-btn
      label="Review reset"
      color="negative"
      icon="warning"
      no-caps
      unelevated
      @click="openResetDialog"
      class="settings-danger-panel__button"
      data-testid="settings-review-reset-btn"
    />

    <q-dialog v-model="isResetDialogOpen" persistent>
      <q-card class="settings-reset-dialog">
        <q-card-section class="settings-reset-dialog__section">
          <div class="settings-reset-dialog__eyebrow">Danger zone</div>
          <div class="settings-reset-dialog__title">Reset this device?</div>
          <div class="settings-reset-dialog__copy">
            This removes local wallet data, federations, Lightning connections, Nostr relays,
            contacts and app settings from this browser. This cannot be undone.
          </div>
        </q-card-section>

        <q-card-section
          class="settings-reset-dialog__section settings-reset-dialog__section--check"
        >
          <q-checkbox
            v-model="resetAcknowledged"
            color="negative"
            class="settings-reset-dialog__checkbox"
            data-testid="settings-reset-confirm-checkbox"
          >
            <span>I understand this clears this device and cannot be undone.</span>
          </q-checkbox>
        </q-card-section>

        <q-card-actions class="settings-reset-dialog__actions">
          <q-btn
            label="Cancel"
            flat
            no-caps
            color="secondary"
            class="settings-reset-dialog__action"
            @click="closeResetDialog"
            data-testid="settings-reset-cancel-btn"
          />
          <q-btn
            label="Reset data"
            color="negative"
            icon="delete"
            no-caps
            unelevated
            class="settings-reset-dialog__action"
            :disable="!resetAcknowledged"
            @click="deleteData"
            data-testid="settings-delete-data-btn"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'DangerZoneSettings',
})

import { ref } from 'vue'
import { useRouter } from 'vue-router'
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
const isResetDialogOpen = ref(false)
const resetAcknowledged = ref(false)

function openResetDialog() {
  resetAcknowledged.value = false
  isResetDialogOpen.value = true
}

function closeResetDialog() {
  isResetDialogOpen.value = false
  resetAcknowledged.value = false
}

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
  if (!resetAcknowledged.value) {
    return
  }

  clearLocalAndWalletData().catch((error) => {
    logger.error('Failed to clear local and wallet data', error)
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
