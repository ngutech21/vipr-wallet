<template>
  <q-page class="dark-gradient" data-testid="settings-page">
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
                  data-testid="settings-bitcoin-connect-btn"
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
                    :data-testid="`settings-remove-relay-btn-${index}`"
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
                  data-testid="settings-new-relay-input"
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
                  data-testid="settings-add-relay-btn"
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
                data-testid="settings-reset-relays-btn"
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
                :label="updateButtonLabel"
                :icon="updateButtonIcon"
                color="primary"
                @click="handleUpdateAction"
                class="q-mt-sm full-width"
                data-testid="settings-check-updates-btn"
                :loading="isUpdateActionRunning"
                :disable="isUpdateActionRunning"
              />
              <div v-if="showApplyRestrictionHint" class="text-warning text-caption q-mt-sm">
                Update is ready. Open Home or Settings to apply safely.
              </div>
            </div>
          </q-card-section>
        </q-card>
      </q-expansion-item>

      <!-- Personal Backup Section -->
      <q-expansion-item
        expand-separator
        icon="shield"
        label="Personal Backup"
        caption="Backup your wallet with recovery words"
        header-class="settings-header"
        expand-icon-class="text-primary"
      >
        <q-card>
          <q-card-section>
            <div class="text-subtitle1 q-mb-md">
              Create a backup of your wallet using recovery words. Write them down and store them
              safely to recover your wallet if you lose access to this device.
            </div>
            <q-btn
              label="Create Backup"
              color="primary"
              icon="backup"
              :to="{ name: '/settings/backup' }"
              class="full-width"
              data-testid="settings-create-backup-btn"
            />
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
              data-testid="settings-open-github-btn"
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
              data-testid="settings-delete-data-btn"
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
import { Dialog, Notify } from 'quasar'
import { useNostrStore } from 'src/stores/nostr'
import { useWalletStore } from 'src/stores/wallet'
import { usePwaUpdateStore } from 'src/stores/pwa-update'
import { logger } from 'src/services/logger'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  getConnectorConfig,
  launchModal,
  onConnected,
  onDisconnected,
} from '@getalby/bitcoin-connect'

const connectedProvider = ref('')
const walletStore = useWalletStore()
const pwaUpdateStore = usePwaUpdateStore()
const route = useRoute()

const isUpdateReady = computed(() => pwaUpdateStore.isUpdateReady)
const isCheckingForUpdates = computed(() => pwaUpdateStore.state === 'checking')
const isApplyingUpdate = computed(() => pwaUpdateStore.state === 'applying')
const isUpdateActionRunning = computed(() => isCheckingForUpdates.value || isApplyingUpdate.value)
const canApplyUpdateHere = computed(() => pwaUpdateStore.canApplyOnRoute(route.name))
const showApplyRestrictionHint = computed(() => isUpdateReady.value && !canApplyUpdateHere.value)
const updateButtonLabel = computed(() =>
  isUpdateReady.value ? 'Update ready' : 'Check for Updates',
)
const updateButtonIcon = computed(() => 'refresh')

function updateConnectedProvider() {
  const config = getConnectorConfig()
  connectedProvider.value = config?.connectorName ?? ''
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
    clearLocalAndWalletData().catch((error) => {
      logger.error('Failed to clear local and wallet data', error)
    })
  })
}

async function clearLocalAndWalletData() {
  await walletStore.clearAllWallets()
  localStorage.clear()
  Notify.create({
    type: 'positive',
    message: 'Data deleted successfully',
    position: 'top',
  })
}
async function handleUpdateAction() {
  if (isUpdateReady.value) {
    await applyUpdate()
  } else {
    await checkForUpdates()
  }
}

async function checkForUpdates() {
  const result = await pwaUpdateStore.checkForUpdatesManual()

  if (result === 'update-ready') {
    Notify.create({
      message: 'Update ready',
      color: 'positive',
      position: 'top',
    })
    return
  }

  if (result === 'up-to-date') {
    Notify.create({
      message: 'No updates available',
      color: 'info',
      position: 'top',
    })
    return
  }

  if (result === 'checking') {
    Notify.create({
      message: 'Update is downloading in the background',
      color: 'info',
      position: 'top',
    })
    return
  }

  if (result === 'not-supported') {
    Notify.create({
      message: 'Service Worker not supported',
      color: 'negative',
      position: 'top',
    })
    return
  }

  if (result === 'not-registered') {
    Notify.create({
      message: 'Service Worker not registered',
      color: 'warning',
      position: 'top',
    })
    return
  }

  Notify.create({
    message: pwaUpdateStore.lastError ?? 'Error checking for updates',
    color: 'negative',
    position: 'top',
  })
}

async function applyUpdate() {
  const result = await pwaUpdateStore.applyUpdate(route.name)

  if (result === 'blocked-route') {
    Notify.create({
      message: 'Update is ready. Open Home or Settings to apply safely.',
      color: 'warning',
      position: 'top',
    })
    return
  }

  if (result === 'no-update') {
    Notify.create({
      message: 'No update is ready yet',
      color: 'info',
      position: 'top',
    })
    return
  }

  if (result === 'checking') {
    Notify.create({
      message: 'Update is downloading in the background',
      color: 'info',
      position: 'top',
    })
    return
  }

  if (result === 'not-supported') {
    Notify.create({
      message: 'Service Worker not supported',
      color: 'negative',
      position: 'top',
    })
    return
  }

  if (result === 'error') {
    Notify.create({
      message: pwaUpdateStore.lastError ?? 'Error applying update',
      color: 'negative',
      position: 'top',
    })
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
  return newRelay.value !== '' && newRelay.value.startsWith('wss://')
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
