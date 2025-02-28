<template>
  <q-page class="column dark-gradient">
    <q-toolbar class="header-section">
      <q-toolbar-title class="text-center">Settings</q-toolbar-title>
    </q-toolbar>

    <div class="q-px-md">
      <q-card class="full-width q-mt-md">
        <q-card-section>
          <div class="text-h6 q-mb-md">Bitcoin Wallet</div>
          <div class="row items-center q-mb-lg">
            <div class="col-12 col-sm-6">
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
                    Connect a Lightning wallet to send and receive payments
                  </div>
                </div>
              </div>
            </div>

            <div class="col-12 col-sm-6 flex justify-end q-mt-md q-mt-sm-none">
              <q-btn
                :label="connectedProvider ? 'Change Wallet' : 'Connect Wallet'"
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

      <q-card class="full-width q-mt-md">
        <q-card-section>
          <div class="text-h6">Nostr</div>

          <!-- <q-input
          v-model="pubkey"
          label="Your Nostr Public Key (npub or hex)"
          outlined
          class="q-mb-md"
          @change="updatePubkey"
          :rules="[
            (val) =>
              !val ||
              val.startsWith('npub1') ||
              /^[0-9a-f]{64}$/.test(val) ||
              'Invalid npub or hex format',
          ]"
        /> -->

          <div class="text-subtitle2 q-mb-sm">Relays</div>
          <q-list bordered separator class="q-mb-md">
            <q-item v-for="(relay, index) in relays" :key="index">
              <q-item-section>{{ relay }}</q-item-section>
              <q-item-section side>
                <q-btn
                  flat
                  round
                  dense
                  icon="delete"
                  color="negative"
                  @click="removeRelay(relay)"
                />
              </q-item-section>
            </q-item>
          </q-list>

          <div class="row q-col-gutter-md">
            <div class="col-8">
              <q-input
                v-model="newRelay"
                label="Add relay URL (wss://...)"
                outlined
                :rules="[(val) => !val || val.startsWith('wss://') || 'Must start with wss://']"
              />
            </div>
            <div class="col-4">
              <q-btn
                label="Add"
                color="primary"
                class="full-width q-mt-sm"
                :disable="!isValidRelayUrl"
                @click="addNewRelay"
              />
            </div>
          </div>

          <q-btn label="Reset to Defaults" outline class="q-mt-md" @click="resetRelays" />
        </q-card-section>
      </q-card>

      <q-card class="full-width q-mt-md">
        <q-card-section>
          <div class="text-subtitle1">App Version: {{ version }}</div>
          <div class="text-subtitle1">Quasar Version: {{ quasarVersion }}</div>
          <BuildInfo />
          <q-btn
            label="Check for Updates"
            icon="refresh"
            color="primary"
            class="q-mt-md"
            @click="checkForUpdates"
          />
        </q-card-section>
      </q-card>

      <q-card class="full-width q-mt-md">
        <q-card-section>
          <div class="text-h6">Danger Zone</div>

          <q-card-actions>
            <q-btn label="Delete ALL Data" color="primary" @click="deleteData" />
          </q-card-actions>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { version } from '../../package.json'
import { version as quasarVersion } from 'quasar/package.json'
import BuildInfo from 'src/components/BuildInfo.vue'
import { Dialog, Loading, Notify } from 'quasar'
import { getErrorMessage } from 'src/utils/error'
import { useNostrStore } from 'src/stores/nostr'
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
  console.log('Deleting data...')
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
        console.error('Error deleting data:', error)
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
    console.error('Error checking for updates:', error)
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
    console.log('All service worker caches cleared')
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
.connection-status {
  display: flex;
  align-items: center;
}

.wallet-details {
  border-left: 4px solid var(--q-secondary);
}

.rounded-borders {
  border-radius: 8px;
}

/* Responsive adjustments */
@media (max-width: 599px) {
  .justify-end {
    justify-content: flex-start;
  }
}
</style>
