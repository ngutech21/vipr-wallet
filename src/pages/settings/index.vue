<template>
  <q-page class="dark-gradient" data-testid="settings-page">
    <div class="q-px-md q-pt-md q-pb-xl">
      <q-expansion-item
        expand-separator
        icon="account_balance_wallet"
        label="Bitcoin Wallet"
        caption="Lightning wallet connection settings"
        header-class="settings-header"
        expand-icon-class="text-primary"
        data-testid="settings-bitcoin-wallet-section"
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
        data-testid="settings-nostr-section"
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

      <q-expansion-item
        expand-separator
        icon="perm_contact_calendar"
        label="Contacts"
        caption="Import payable Nostr contacts for Lightning"
        header-class="settings-header"
        expand-icon-class="text-primary"
        data-testid="settings-contacts-section"
      >
        <q-card>
          <q-card-section>
            <div class="contacts-section">
              <div class="text-subtitle2 q-mb-sm">Sync Contacts</div>
              <q-btn-toggle
                v-model="contactSourceType"
                unelevated
                toggle-color="primary"
                :options="contactSourceOptions"
                class="q-mb-md full-width contacts-source-toggle"
                data-testid="settings-contact-source-toggle"
              />

              <q-input
                v-model="contactSourceValue"
                outlined
                :label="contactSourceLabel"
                :placeholder="contactSourcePlaceholder"
                class="relay-input"
                data-testid="settings-contact-source-input"
              />

              <div class="text-caption text-grey-8 q-mt-xs">
                {{ contactSourceHint }}
              </div>

              <div class="contacts-actions q-mt-md">
                <q-btn
                  label="Sync contacts"
                  color="primary"
                  class="full-width"
                  :loading="isSyncingContacts"
                  :disable="isSyncingContacts"
                  @click="syncContacts"
                  data-testid="settings-sync-contacts-btn"
                />
                <q-btn
                  label="Clear contacts"
                  outline
                  color="secondary"
                  class="full-width q-mt-sm"
                  :disable="isSyncingContacts"
                  @click="clearContacts"
                  data-testid="settings-clear-contacts-btn"
                />
              </div>

              <div
                v-if="contactSyncError"
                class="text-negative text-caption q-mt-sm"
                data-testid="settings-contact-sync-error"
              >
                {{ contactSyncError }}
              </div>

              <div class="contacts-summary q-mt-md">
                <div class="text-caption text-grey-8" data-testid="settings-contact-count">
                  {{ syncedContacts.length }} imported contacts
                </div>
                <div
                  v-if="lastSyncedLabel"
                  class="text-caption text-grey-8 q-mt-xs"
                  data-testid="settings-contact-last-synced"
                >
                  {{ lastSyncedLabel }}
                </div>
              </div>

              <q-list
                bordered
                separator
                class="rounded-borders q-mt-md"
                data-testid="settings-contact-list"
              >
                <q-item v-if="syncedContacts.length === 0">
                  <q-item-section avatar>
                    <div class="empty-contact-avatar" aria-hidden="true"></div>
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>No contacts imported yet</q-item-label>
                    <q-item-label caption>
                      Sync a NIP-05 or npub to import payable Nostr contacts.
                    </q-item-label>
                  </q-item-section>
                </q-item>

                <q-item
                  v-for="contact in visibleContacts"
                  :key="contact.pubkey"
                  :data-testid="`settings-contact-item-${contact.pubkey}`"
                >
                  <q-item-section avatar>
                    <q-avatar v-if="contact.picture">
                      <img :src="contact.picture" :alt="getContactDisplayName(contact)" />
                    </q-avatar>
                    <q-icon v-else name="account_circle" size="md" color="grey-5" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ getContactDisplayName(contact) }}</q-item-label>
                    <q-item-label caption>{{ getContactSubtitle(contact) }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-chip dense outline :label="contact.lud16 ? 'Lightning Address' : 'LNURL'" />
                  </q-item-section>
                </q-item>
              </q-list>

              <div
                v-if="syncedContacts.length > 0"
                class="row items-center justify-between q-mt-sm q-gutter-sm"
              >
                <div class="text-caption text-grey-8" data-testid="settings-contact-visible-count">
                  Showing {{ visibleContacts.length }} of {{ syncedContacts.length }} contacts
                </div>
                <q-btn
                  v-if="hasMoreContacts"
                  label="Show more"
                  flat
                  color="primary"
                  @click="showMoreContacts"
                  data-testid="settings-show-more-contacts-btn"
                />
              </div>
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
        header-class="settings-header"
        expand-icon-class="text-primary"
      >
        <template #header>
          <q-item-section avatar>
            <q-icon name="shield" />
          </q-item-section>
          <q-item-section data-testid="settings-personal-backup-section">
            <q-item-label>Personal Backup</q-item-label>
            <q-item-label caption>Backup your wallet with recovery words</q-item-label>
          </q-item-section>
        </template>
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
              rel="noopener noreferrer"
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
import { useAppNotify } from 'src/composables/useAppNotify'
import { useNostrStore } from 'src/stores/nostr'
import { useWalletStore } from 'src/stores/wallet'
import { useFederationStore } from 'src/stores/federation'
import { useOnboardingStore } from 'src/stores/onboarding'
import { usePwaUpdateStore } from 'src/stores/pwa-update'
import { logger } from 'src/services/logger'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { NostrContactSourceType, SyncedNostrContact } from 'src/types/nostr'
import { getNostrContactDisplayName, getNostrContactSubtitle } from 'src/utils/nostrContacts'
import {
  getConnectorConfig,
  launchModal,
  onConnected,
  onDisconnected,
} from '@getalby/bitcoin-connect'

const APP_LOCAL_STORAGE_PREFIX = 'vipr.'

const connectedProvider = ref('')
const nostrStore = useNostrStore()
const walletStore = useWalletStore()
const federationStore = useFederationStore()
const onboardingStore = useOnboardingStore()
const pwaUpdateStore = usePwaUpdateStore()
const router = useRouter()
const route = useRoute()
const notify = useAppNotify()

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
const syncedContacts = computed(() => nostrStore.contacts)
const isSyncingContacts = computed(() => nostrStore.syncStatus === 'syncing')
const contactSyncError = computed(() => nostrStore.contactSyncMeta.lastSyncError)
const INITIAL_VISIBLE_CONTACTS = 10
const CONTACTS_PAGE_SIZE = 10
const visibleContactCount = ref(INITIAL_VISIBLE_CONTACTS)
const lastSyncedLabel = computed(() => {
  if (nostrStore.contactSyncMeta.lastSyncedAt == null) {
    return ''
  }

  return `Last synced: ${new Date(nostrStore.contactSyncMeta.lastSyncedAt).toLocaleString()}`
})
const visibleContacts = computed(() => syncedContacts.value.slice(0, visibleContactCount.value))
const hasMoreContacts = computed(() => visibleContactCount.value < syncedContacts.value.length)
const contactSourceOptions = [
  { label: 'NIP-05', value: 'nip05' },
  { label: 'npub', value: 'npub' },
]

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
  clearAppLocalStorage()
  federationStore.$reset()
  nostrStore.$reset()
  onboardingStore.$reset()
  pwaUpdateStore.$reset()
  notify.success('Data deleted successfully')
  await router.replace({ name: '/startup-wizard' })
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
const relays = ref(nostrStore.relays)
const newRelay = ref('')
const contactSourceType = ref<NostrContactSourceType>(nostrStore.contactSource.sourceType)
const contactSourceValue = ref(nostrStore.contactSource.sourceValue)

// Watch for store changes to keep local refs in sync
watch(
  () => nostrStore.relays,
  (newRelays) => {
    relays.value = [...newRelays]
  },
  { deep: true },
)

watch(
  () => nostrStore.contactSource,
  (newSource) => {
    contactSourceType.value = newSource.sourceType
    contactSourceValue.value = newSource.sourceValue
  },
  { deep: true },
)

watch(syncedContacts, () => {
  visibleContactCount.value = INITIAL_VISIBLE_CONTACTS
})

const isValidRelayUrl = computed(() => {
  return newRelay.value !== '' && newRelay.value.startsWith('wss://')
})

const contactSourceLabel = computed(() => {
  return contactSourceType.value === 'nip05' ? 'NIP-05 Identifier' : 'npub'
})

const contactSourcePlaceholder = computed(() => {
  return contactSourceType.value === 'nip05' ? 'user@domain.com' : 'npub1...'
})

const contactSourceHint = computed(() => {
  return contactSourceType.value === 'nip05'
    ? 'Enter a NIP-05 identifier like user@domain.com.'
    : 'Enter the npub for the account whose follows should be imported.'
})

async function addNewRelay() {
  if (isValidRelayUrl.value && (await nostrStore.addRelay(newRelay.value))) {
    notify.success(`Added relay: ${newRelay.value}`)
    newRelay.value = ''
  } else {
    notify.error('Invalid relay URL or already exists')
  }
}

async function removeRelay(relay: string) {
  if (await nostrStore.removeRelay(relay)) {
    notify.info(`Removed relay: ${relay}`)
  }
}

async function resetRelays() {
  await nostrStore.resetRelays()
  notify.info('Reset relays to defaults')
}

async function syncContacts() {
  nostrStore.setContactSource(contactSourceType.value, contactSourceValue.value)

  if (await nostrStore.syncContacts()) {
    notify.success(`Imported ${nostrStore.contacts.length} contacts`)
  } else {
    notify.error(nostrStore.contactSyncMeta.lastSyncError ?? 'Failed to sync contacts')
  }
}

function clearContacts() {
  nostrStore.clearContacts()
  notify.info('Cleared imported contacts')
}

function showMoreContacts() {
  visibleContactCount.value += CONTACTS_PAGE_SIZE
}

function getContactDisplayName(contact: SyncedNostrContact): string {
  return getNostrContactDisplayName(contact)
}

function getContactSubtitle(contact: SyncedNostrContact): string {
  return getNostrContactSubtitle(contact)
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

.contacts-section {
  max-width: 720px;
}

.contacts-source-toggle {
  display: block;
}

.contacts-summary {
  min-height: 20px;
}

.empty-contact-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.18);
  position: relative;
}

.empty-contact-avatar::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 8px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.52);
  transform: translateX(-50%);
}

.empty-contact-avatar::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 6px;
  width: 16px;
  height: 8px;
  border-radius: 999px 999px 6px 6px;
  background: rgba(255, 255, 255, 0.35);
  transform: translateX(-50%);
}

.relay-input :deep(.q-field__bottom) {
  padding: 4px 12px 0;
}

.rounded-borders {
  border-radius: 8px;
}

.rounded-borders :deep(.q-item__section--avatar) {
  min-width: 48px;
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

  .contacts-section {
    max-width: none;
  }
}
</style>
