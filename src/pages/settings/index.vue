<template>
  <q-page class="dark-gradient">
    <q-toolbar class="header-section q-mb-md">
      <q-toolbar-title class="text-center">Settings</q-toolbar-title>
    </q-toolbar>

    <div class="q-px-md q-pb-xl">
      <q-expansion-item
        expand-separator
        icon="account_balance_wallet"
        label="Bitcoin Wallet"
        caption="Lightning wallet connection settings"
        header-class="settings-header"
        expand-icon-class="text-primary"
      >
        <q-card>
          <q-card-section>
            <div class="row items-center q-mb-md">
              <div class="col-12 col-sm-8">
                <div class="connection-status">
                  <q-icon
                    :name="connectedProvider ? 'check_circle' : 'radio_button_unchecked'"
                    :class="connectedProvider ? 'text-positive' : 'text-grey-6'"
                    size="md"
                    class="q-mr-sm"
                  />
                  <div>
                    <div class="text-subtitle1 q-mb-xs">
                      {{ connectedProvider ? 'Connected' : 'Not Connected' }}
                    </div>
                    <div class="text-caption text-grey-8" v-if="connectedProvider">
                      {{ connectedProvider }}
                    </div>
                    <div class="text-caption text-grey-8" v-else>
                      Connect to send and receive payments via Lightning
                    </div>
                  </div>
                </div>
              </div>

              <div class="col-12 col-sm-4 flex justify-end q-mt-sm q-mt-sm-none">
                <q-btn
                  :label="connectedProvider ? 'Change' : 'Connect'"
                  :icon="connectedProvider ? 'swap_horiz' : 'bolt'"
                  :color="connectedProvider ? 'secondary' : 'primary'"
                  @click="configureBitcoinConnect"
                  :flat="!!connectedProvider"
                  :outline="!!connectedProvider"
                />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </q-expansion-item>

      <!-- Nostr Settings Section -->
      <q-expansion-item
        expand-separator
        icon="forum"
        label="Nostr Settings"
        caption="Manage your Nostr relays"
        header-class="settings-header"
        expand-icon-class="text-primary"
      >
        <q-card>
          <q-card-section>
            <!-- Relays List -->
            <div class="text-subtitle2 q-mb-sm">Relays</div>
            <q-list bordered separator class="rounded-borders q-mb-md">
              <q-item v-for="(relay, index) in relays" :key="index">
                <q-item-section>
                  <q-item-label>{{ relay }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                  <q-btn
                    flat
                    round
                    dense
                    icon="delete"
                    color="negative"
                    size="sm"
                    @click="removeRelay(relay)"
                  />
                </q-item-section>
              </q-item>

              <!-- Empty state -->
              <q-item v-if="relays.length === 0">
                <q-item-section>
                  <q-item-label caption>No relays configured</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>

            <!-- Add new relay -->
            <div class="row q-col-gutter-md items-center">
              <div class="col-8">
                <q-input
                  v-model="newRelay"
                  label="Add relay URL"
                  outlined
                  dense
                  placeholder="Must start with wss://"
                  class="relay-input"
                />
              </div>
              <div class="col-4">
                <q-btn
                  label="Add"
                  icon="add"
                  color="primary"
                  class="full-width"
                  :disable="!isValidRelayUrl"
                  @click="addNewRelay"
                />
              </div>
            </div>

            <div class="q-mt-md">
              <q-btn
                label="Reset to Defaults"
                outline
                color="secondary"
                icon="settings_backup_restore"
                @click="resetRelays"
              />
            </div>
          </q-card-section>
        </q-card>
      </q-expansion-item>

      <!-- App Version Section -->
      <q-expansion-item
        expand-separator
        icon="info"
        label="App Info & Updates"
        caption="Version information and updates"
        header-class="settings-header"
        expand-icon-class="text-primary"
      >
        <q-card>
          <q-card-section class="column">
            <!-- Version information -->
            <div class="q-mb-md">
              <div class="text-subtitle1">App Version: {{ version }}</div>
              <div class="text-subtitle1">Quasar Version: {{ quasarVersion }}</div>
              <BuildInfo />
            </div>

            <!-- Update button below version info -->
            <div>
              <q-btn
                label="Check for Updates"
                icon="refresh"
                color="primary"
                @click="checkForUpdates"
                class="q-mt-sm full-width"
              />
            </div>
          </q-card-section>
        </q-card>
      </q-expansion-item>

      <q-expansion-item
        expand-separator
        icon="code"
        label="Source Code"
        caption="View the project on GitHub"
        header-class="settings-header"
        expand-icon-class="text-primary"
      >
        <q-card>
          <q-card-section>
            <div class="text-subtitle2 q-mb-sm">
              Built with ❤️ as free and open source software - check it out on GitHub
            </div>
            <q-btn
              label="Open GitHub Repository"
              icon="open_in_new"
              color="primary"
              :href="'https://github.com/ngutech21/vipr-wallet'"
              target="_blank"
              class="full-width"
            />
          </q-card-section>
        </q-card>
      </q-expansion-item>

      <!-- Danger Zone -->
      <q-expansion-item
        expand-separator
        icon="warning"
        label="Danger Zone"
        caption="Delete all data and reset the app"
        header-class="settings-header danger-header"
        expand-icon-class="text-negative"
      >
        <q-card>
          <q-card-section>
            <div class="text-subtitle1 q-mb-md">
              Deleting all data will remove your wallet connections, federations and all settings.
              This cannot be undone.
            </div>
            <q-btn
              label="Delete ALL Data"
              color="negative"
              icon="delete"
              @click="deleteData"
              class="full-width"
            />
          </q-card-section>
        </q-card>
      </q-expansion-item>
    </div>
  </q-page>
</template>

<script setup lang="ts">
defineOptions({
  name: 'SettingsPage',
})

import { version } from '../../../package.json'
import { version as quasarVersion } from 'quasar/package.json'
import BuildInfo from 'src/components/BuildInfo.vue'
import { Dialog, Loading, Notify } from 'quasar'
import { getErrorMessage } from 'src/utils/error'
import { useNostrStore } from 'src/stores/nostr'
import { logger } from 'src/services/logger'
import { computed, ref, watch } from 'vue'
import {
  getConnectorConfig,
  launchModal,
  onConnected,
  onDisconnected,
} from '@getalby/bitcoin-connect'

const connectedProvider = ref('')

function updateConnectedProvider() {
  const config = getConnectorConfig()
  connectedProvider.value = config?.connectorName || ''
}

onDisconnected(() => {
  updateConnectedProvider()
})

onConnected(() => {
  updateConnectedProvider()
})

function configureBitcoinConnect() {
  launchModal()
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
    Loading.show({ message: 'Deleting data...' })
    localStorage.clear()
    indexedDB
      .databases()
      .then((databases) => {
        if (databases.length === 0) {
          return
        }
        const deletePromises = databases
          .filter((db): db is IDBDatabaseInfo & { name: string } => !!db.name)
          .map((db) => indexedDB.deleteDatabase(db.name))
        return Promise.all(deletePromises)
      })
      .catch((error) => {
        logger.error('Failed to delete user data', error)
        Notify.create({
          type: 'negative',
          message: `Error deleting data ${getErrorMessage(error)}`,
          position: 'top',
        })
      })
      .finally(() => {
        window.location.reload()
        Loading.hide()
        Notify.create({
          type: 'positive',
          message: 'Data deleted successfully',
          position: 'top',
        })
      })
  })
}
async function checkForUpdates() {
  if (!('serviceWorker' in navigator)) {
    Notify.create({
      message: 'Service Worker not supported',
      color: 'negative',
      position: 'top',
    })
    return
  }

  try {
    Loading.show({ message: 'Checking for updates...' })
    await clearServiceWorkerCaches()

    const registration = await navigator.serviceWorker.getRegistration()

    if (!registration) {
      Notify.create({
        message: 'Service Worker not registered',
        color: 'warning',
        position: 'top',
      })
      return
    }

    // First, check for updates and wait for it to complete
    await registration.update()

    // Then check if we have a waiting worker
    if (registration.waiting) {
      Dialog.create({
        title: 'Update Available',
        message: 'A new version is available. Update now?',
        persistent: true,
        ok: { label: 'Update', color: 'primary' },
        cancel: true,
      }).onOk(() => {
        registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
        window.location.reload()
      })
    } else {
      Notify.create({
        message: 'No updates available',
        color: 'info',
        position: 'top',
      })
    }
  } catch (error) {
    logger.error('Failed to check for app updates', error)
    Notify.create({
      message: 'Error checking for updates',
      color: 'negative',
      position: 'top',
    })
  } finally {
    Loading.hide()
  }
}

async function clearServiceWorkerCaches() {
  if ('caches' in window) {
    const cacheNames = await caches.keys()
    await Promise.all(cacheNames.map((name) => caches.delete(name)))
    logger.pwa.debug('Service worker caches cleared', { cacheCount: cacheNames.length })
  }
}

// Nostr settings
const nostrStore = useNostrStore()
const relays = ref(nostrStore.relays)
//const pubkey = ref(nostrStore.pubkey)
const newRelay = ref('')

// Watch for store changes to keep local refs in sync
watch(
  () => nostrStore.relays,
  (newRelays) => {
    relays.value = [...newRelays]
  },
  { deep: true },
)

const isValidRelayUrl = computed(() => {
  return newRelay.value && newRelay.value.startsWith('wss://')
})

// function updatePubkey() {
//   nostrStore.setPubkey(pubkey.value)
// }

async function addNewRelay() {
  if (isValidRelayUrl.value && (await nostrStore.addRelay(newRelay.value))) {
    Notify.create({
      type: 'positive',
      message: `Added relay: ${newRelay.value}`,
      position: 'top',
    })
    newRelay.value = ''
  } else {
    Notify.create({
      type: 'negative',
      message: 'Invalid relay URL or already exists',
      position: 'top',
    })
  }
}

async function removeRelay(relay: string) {
  if (await nostrStore.removeRelay(relay)) {
    Notify.create({
      type: 'info',
      message: `Removed relay: ${relay}`,
      position: 'top',
    })
  }
}

async function resetRelays() {
  await nostrStore.resetRelays()
  Notify.create({
    type: 'info',
    message: 'Reset relays to defaults',
    position: 'top',
  })
}
</script>

<style scoped>
.full-width {
  width: 100%;
}

.settings-header {
  font-weight: 500;
}

.danger-header {
  color: var(--q-negative);
}

.connection-status {
  display: flex;
  align-items: center;
}

.relay-input :deep(.q-field__bottom) {
  padding: 4px 12px 0;
}

.rounded-borders {
  border-radius: 8px;
}

:deep(.q-expansion-item) {
  margin-bottom: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

:deep(.q-expansion-item__content) {
  background: rgba(255, 255, 255, 0.03);
}

:deep(.q-card) {
  background: transparent;
  box-shadow: none;
}

:deep(.q-item__section--side) .q-btn {
  margin-right: -8px;
}

:deep(.q-expansion-item__content .q-item) {
  padding: 10px 16px;
}

/* Responsive adjustments */
@media (max-width: 599px) {
  .justify-end {
    justify-content: flex-start;
    margin-top: 8px;
  }
}
</style>
