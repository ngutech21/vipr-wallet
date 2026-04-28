<template>
  <q-page class="dark-gradient" data-testid="settings-page">
    <div class="settings-page">
      <div class="settings-stack settings-stack--primary">
        <q-expansion-item
          class="settings-section settings-section--primary"
          icon="wallet"
          label="Lightning"
          caption="Connect wallet"
          header-class="settings-header"
          expand-icon-class="text-primary"
          data-testid="settings-bitcoin-wallet-section"
        >
          <q-card>
            <q-card-section class="settings-panel settings-panel--compact">
              <div class="settings-inline-grid settings-inline-grid--center">
                <div class="settings-inline-grid__main">
                  <div class="connection-status">
                    <q-icon
                      :name="connectedProvider ? 'check_circle' : 'radio_button_unchecked'"
                      :class="connectedProvider ? 'text-positive' : 'settings-disconnected-icon'"
                      size="md"
                      class="connection-status__icon"
                    />
                    <div>
                      <div class="settings-subtitle">
                        {{ connectedProvider ? 'Connected' : 'Not Connected' }}
                      </div>
                      <div class="settings-caption settings-muted" v-if="connectedProvider">
                        {{ connectedProvider }}
                      </div>
                      <div class="settings-caption settings-muted" v-else>
                        Connect to send and receive payments via Lightning
                      </div>
                    </div>
                  </div>
                </div>

                <div class="settings-inline-grid__side settings-inline-grid__side--end">
                  <q-btn
                    :label="connectedProvider ? 'Change' : 'Connect'"
                    :icon="connectedProvider ? 'swap_horiz' : 'link'"
                    :color="connectedProvider ? 'secondary' : 'primary'"
                    no-caps
                    unelevated
                    class="settings-action-btn"
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

        <!-- Nostr Section -->
        <q-expansion-item
          class="settings-section settings-section--primary"
          icon="forum"
          label="Nostr"
          caption="Manage relays"
          header-class="settings-header"
          expand-icon-class="text-primary"
          data-testid="settings-nostr-section"
        >
          <q-card>
            <q-card-section class="settings-panel">
              <!-- Relays List -->
              <div class="settings-section-title">Relays</div>
              <q-list bordered separator class="rounded-borders settings-list settings-block">
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
              <div class="settings-relay-actions">
                <div class="settings-inline-grid settings-inline-grid--center">
                  <div class="settings-inline-grid__main">
                    <q-input
                      v-model="newRelay"
                      label="Add relay URL"
                      filled
                      dark
                      dense
                      placeholder="Must start with wss://"
                      class="vipr-input relay-input"
                      data-testid="settings-new-relay-input"
                    />
                  </div>
                  <div class="settings-inline-grid__side">
                    <q-btn
                      label="Add"
                      icon="add"
                      color="primary"
                      no-caps
                      unelevated
                      class="settings-action-full"
                      :disable="!isValidRelayUrl"
                      @click="addNewRelay"
                      data-testid="settings-add-relay-btn"
                    />
                  </div>
                </div>

                <div class="settings-relay-reset">
                  <q-btn
                    label="Reset to Defaults"
                    outline
                    no-caps
                    color="secondary"
                    icon="settings_backup_restore"
                    class="settings-action-btn settings-action-btn--secondary"
                    @click="resetRelays"
                    data-testid="settings-reset-relays-btn"
                  />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </q-expansion-item>

        <q-expansion-item
          class="settings-section settings-section--primary"
          icon="perm_contact_calendar"
          label="Contacts"
          caption="Sync nostr contacts"
          header-class="settings-header"
          expand-icon-class="text-primary"
          data-testid="settings-contacts-section"
        >
          <q-card>
            <q-card-section class="settings-panel">
              <div class="contacts-section">
                <div class="settings-section-title">Sync Contacts</div>
                <q-input
                  v-model="contactSourceValue"
                  filled
                  dark
                  label="Nostr identifier"
                  placeholder="user@domain.com or npub1..."
                  class="vipr-input relay-input"
                  data-testid="settings-contact-source-input"
                />

                <div class="settings-caption settings-muted settings-caption--spaced">
                  Enter a NIP-05 identifier or npub for the account whose follows should be
                  imported.
                </div>

                <div class="contacts-actions">
                  <q-btn
                    label="Sync contacts"
                    color="primary"
                    no-caps
                    unelevated
                    class="settings-action-full"
                    :loading="isSyncingContacts"
                    :disable="isSyncingContacts"
                    @click="syncContacts"
                    data-testid="settings-sync-contacts-btn"
                  />
                  <q-btn
                    label="Clear contacts"
                    outline
                    no-caps
                    color="secondary"
                    class="settings-action-full contacts-action-secondary"
                    :disable="isSyncingContacts"
                    @click="clearContacts"
                    data-testid="settings-clear-contacts-btn"
                  />
                </div>

                <div
                  v-if="contactSyncError"
                  class="settings-error"
                  data-testid="settings-contact-sync-error"
                >
                  {{ contactSyncError }}
                </div>

                <div class="contacts-summary">
                  <div class="settings-caption settings-muted" data-testid="settings-contact-count">
                    {{ syncedContacts.length }} imported contacts
                  </div>
                  <div
                    v-if="lastSyncedLabel"
                    class="settings-caption settings-muted settings-caption--spaced"
                    data-testid="settings-contact-last-synced"
                  >
                    {{ lastSyncedLabel }}
                  </div>
                </div>

                <q-list
                  bordered
                  separator
                  class="rounded-borders settings-list settings-list--spaced"
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
                      <q-icon
                        v-else
                        name="account_circle"
                        size="md"
                        class="settings-contact-placeholder-icon"
                      />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ getContactDisplayName(contact) }}</q-item-label>
                      <q-item-label caption>{{ getContactSubtitle(contact) }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </q-list>

                <div v-if="syncedContacts.length > 0" class="settings-contact-pagination">
                  <div
                    class="settings-caption settings-muted"
                    data-testid="settings-contact-visible-count"
                  >
                    Showing {{ visibleContacts.length }} of {{ syncedContacts.length }} contacts
                  </div>
                  <q-btn
                    v-if="hasMoreContacts"
                    label="Show more"
                    flat
                    no-caps
                    color="primary"
                    @click="showMoreContacts"
                    data-testid="settings-show-more-contacts-btn"
                  />
                </div>
              </div>
            </q-card-section>
          </q-card>
        </q-expansion-item>
      </div>

      <div class="settings-stack settings-stack--secondary">
        <!-- Updates Section -->
        <q-expansion-item
          class="settings-section settings-section--secondary"
          icon="update"
          label="Updates"
          caption="Check for updates"
          header-class="settings-header"
          expand-icon-class="text-primary"
        >
          <q-card>
            <q-card-section class="settings-panel settings-panel--secondary">
              <!-- Version information -->
              <div class="settings-copy-block settings-block">
                <BuildInfo />
              </div>

              <!-- Update button below version info -->
              <div>
                <q-btn
                  :label="updateButtonLabel"
                  :icon="updateButtonIcon"
                  color="primary"
                  no-caps
                  unelevated
                  @click="handleUpdateAction"
                  class="settings-action-full"
                  data-testid="settings-check-updates-btn"
                  :loading="isUpdateActionRunning"
                  :disable="isUpdateActionRunning"
                />
                <div v-if="showApplyRestrictionHint" class="settings-warning">
                  Update is ready. Open Home or Settings to apply safely.
                </div>
              </div>
            </q-card-section>
          </q-card>
        </q-expansion-item>

        <!-- Backup Section -->
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
                Create a backup of your wallet using your recovery phrase. Write it down and store
                it safely to recover your wallet if you lose access to this device.
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

        <q-expansion-item
          class="settings-section settings-section--secondary"
          icon="lock"
          label="App Lock"
          caption="PIN and Face ID"
          header-class="settings-header"
          expand-icon-class="text-primary"
          data-testid="settings-app-lock-section"
        >
          <q-card>
            <q-card-section class="settings-panel settings-panel--secondary">
              <div class="settings-copy-block settings-block" data-testid="settings-app-lock-copy">
                Protect Vipr on this device with a local PIN. Face ID / Touch ID can be enabled
                after a PIN is set.
              </div>

              <div class="settings-app-lock-status">
                <div class="settings-subtitle">{{ appLockStatusLabel }}</div>
                <div class="settings-caption settings-muted">
                  Vipr locks on app start and after 30 seconds in the background.
                </div>
              </div>

              <div class="settings-app-lock-actions">
                <q-btn
                  v-if="!isAppLockPinConfigured"
                  label="Set PIN"
                  icon="lock"
                  color="primary"
                  no-caps
                  unelevated
                  class="settings-action-full"
                  @click="openSetupPin"
                  data-testid="settings-app-lock-set-pin-btn"
                />

                <template v-else>
                  <q-btn
                    label="Change PIN"
                    icon="lock"
                    color="primary"
                    no-caps
                    unelevated
                    class="settings-action-full"
                    @click="openChangePin"
                    data-testid="settings-app-lock-change-pin-btn"
                  />
                  <q-btn
                    label="Remove PIN"
                    icon="delete"
                    outline
                    no-caps
                    color="secondary"
                    class="settings-action-full"
                    @click="openRemovePin"
                    data-testid="settings-app-lock-remove-pin-btn"
                  />
                </template>

                <q-btn
                  :label="biometricButtonLabel"
                  icon="fingerprint"
                  :color="isBiometricEnabled ? 'secondary' : 'primary'"
                  :outline="isBiometricEnabled"
                  no-caps
                  unelevated
                  class="settings-action-full"
                  :disable="!isAppLockPinConfigured || biometricBusy || !biometricAvailable"
                  :loading="biometricBusy"
                  @click="toggleBiometric"
                  data-testid="settings-app-lock-biometric-btn"
                />

                <div
                  v-if="!biometricAvailable"
                  class="settings-warning"
                  data-testid="settings-app-lock-biometric-unavailable"
                >
                  Face ID / Touch ID is not available in this browser.
                </div>
              </div>
            </q-card-section>
          </q-card>
        </q-expansion-item>

        <q-expansion-item
          class="settings-section settings-section--secondary"
          icon="code"
          label="GitHub"
          caption="View the project"
          header-class="settings-header"
          expand-icon-class="text-primary"
        >
          <q-card>
            <q-card-section class="settings-panel settings-panel--secondary">
              <div class="settings-copy-block settings-copy-block--compact">
                Built with ❤️ as free and open source software. You can review the project on
                GitHub.
              </div>
              <q-btn
                label="Open GitHub Repository"
                icon="open_in_new"
                color="primary"
                no-caps
                unelevated
                :href="'https://github.com/ngutech21/vipr-wallet'"
                target="_blank"
                rel="noopener noreferrer"
                class="settings-action-full"
                data-testid="settings-open-github-btn"
              />
            </q-card-section>
          </q-card>
        </q-expansion-item>

        <!-- Reset Section -->
        <q-expansion-item
          class="settings-section settings-section--danger"
          icon="warning"
          label="Reset"
          caption="Clear local data"
          header-class="settings-header danger-header"
          expand-icon-class="text-negative"
        >
          <q-card>
            <q-card-section class="settings-panel settings-panel--danger">
              <div class="settings-copy-block settings-block">
                Deleting all data will remove your wallet connections, federations and all settings.
                This cannot be undone.
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
            </q-card-section>
          </q-card>
        </q-expansion-item>
      </div>

      <q-dialog v-model="isAccessDialogOpen" persistent>
        <q-card class="settings-access-dialog">
          <q-card-section>
            <AppLockPinEntry
              :key="accessDialogMode ?? 'closed'"
              :mode="accessDialogPinMode"
              :title="accessDialogTitle"
              :subtitle="accessDialogSubtitle"
              :submit-label="accessDialogSubmitLabel"
              :confirm-submit-label="accessDialogConfirmLabel"
              icon="lock"
              :on-submit="handleAccessPinSubmit"
              @success="handleAccessPinSuccess"
              data-testid="settings-app-lock-pin-dialog"
            />
            <q-btn
              label="Cancel"
              flat
              no-caps
              color="secondary"
              class="settings-action-full settings-access-dialog__cancel"
              @click="closeAccessDialog"
              data-testid="settings-app-lock-pin-cancel-btn"
            />
          </q-card-section>
        </q-card>
      </q-dialog>
    </div>
  </q-page>
</template>

<script setup lang="ts">
defineOptions({
  name: 'SettingsPage',
})

import BuildInfo from 'src/components/BuildInfo.vue'
import AppLockPinEntry from 'src/components/AppLockPinEntry.vue'
import { Dialog } from 'quasar'
import { useAppNotify } from 'src/composables/useAppNotify'
import { useNostrStore } from 'src/stores/nostr'
import { useWalletStore } from 'src/stores/wallet'
import { useFederationStore } from 'src/stores/federation'
import { useOnboardingStore } from 'src/stores/onboarding'
import { usePwaUpdateStore } from 'src/stores/pwa-update'
import { useAppLockStore } from 'src/stores/app-lock'
import { logger } from 'src/services/logger'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { SyncedNostrContact } from 'src/types/nostr'
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
const appLockStore = useAppLockStore()
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
  isUpdateReady.value ? 'Update ready' : 'Check for updates',
)
const updateButtonIcon = computed(() => (isUpdateReady.value ? 'update' : 'refresh'))
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
const biometricAvailable = ref(false)
const biometricBusy = ref(false)
type AccessDialogMode = 'setup' | 'verify-current-for-change' | 'verify-current-for-remove' | null
const accessDialogMode = ref<AccessDialogMode>(null)
const isAppLockPinConfigured = computed(() => appLockStore.isPinConfigured)
const isBiometricEnabled = computed(() => appLockStore.isBiometricEnabled)
const appLockStatusLabel = computed(() =>
  isAppLockPinConfigured.value ? 'PIN is enabled' : 'PIN is not set',
)
const biometricButtonLabel = computed(() =>
  isBiometricEnabled.value ? 'Disable Face ID / Touch ID' : 'Enable Face ID / Touch ID',
)
const isAccessDialogOpen = computed({
  get: () => accessDialogMode.value != null,
  set: (open: boolean) => {
    if (!open) {
      accessDialogMode.value = null
    }
  },
})
const accessDialogPinMode = computed<'setup' | 'verify'>(() =>
  accessDialogMode.value === 'setup' ? 'setup' : 'verify',
)
const accessDialogTitle = computed(() => {
  if (accessDialogMode.value === 'setup') {
    return isAppLockPinConfigured.value ? 'Set new PIN' : 'Set PIN'
  }

  return 'Enter current PIN'
})
const accessDialogSubtitle = computed(() => {
  if (accessDialogMode.value === 'setup') {
    return 'Choose a 4-6 digit PIN.'
  }

  return 'Confirm your PIN to continue.'
})
const accessDialogSubmitLabel = computed(() =>
  accessDialogMode.value === 'setup' ? 'Continue' : 'Confirm',
)
const accessDialogConfirmLabel = computed(() =>
  accessDialogMode.value === 'setup' ? 'Save PIN' : 'Confirm',
)

onMounted(() => {
  refreshBiometricAvailability().catch(() => {
    biometricAvailable.value = false
  })
})

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

async function refreshBiometricAvailability(): Promise<void> {
  biometricAvailable.value = await appLockStore.isBiometricAvailable()
}

function openSetupPin() {
  accessDialogMode.value = 'setup'
}

function openChangePin() {
  accessDialogMode.value = 'verify-current-for-change'
}

function openRemovePin() {
  accessDialogMode.value = 'verify-current-for-remove'
}

function closeAccessDialog() {
  accessDialogMode.value = null
}

async function handleAccessPinSubmit(pin: string): Promise<boolean> {
  if (accessDialogMode.value === 'setup') {
    try {
      await appLockStore.setPin(pin)
      return true
    } catch (error) {
      logger.ui.warn('Failed to set app lock PIN', { error })
      return false
    }
  }

  return await appLockStore.verifyPin(pin)
}

function handleAccessPinSuccess() {
  if (accessDialogMode.value === 'verify-current-for-change') {
    accessDialogMode.value = 'setup'
    return
  }

  if (accessDialogMode.value === 'verify-current-for-remove') {
    appLockStore.removePin()
    accessDialogMode.value = null
    notify.info('PIN removed')
    return
  }

  accessDialogMode.value = null
  notify.success('PIN saved')
}

async function toggleBiometric() {
  if (isBiometricEnabled.value) {
    appLockStore.disableBiometric()
    notify.info('Face ID / Touch ID disabled')
    return
  }

  biometricBusy.value = true
  try {
    await appLockStore.enableBiometric()
    notify.success('Face ID / Touch ID enabled')
  } catch (error) {
    notify.warning(error instanceof Error ? error.message : 'Face ID / Touch ID setup failed')
  } finally {
    biometricBusy.value = false
  }
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
  appLockStore.clearAll()
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
    notify.success('Update ready')
    return
  }

  if (result === 'up-to-date') {
    notify.info('No updates available')
    return
  }

  if (result === 'checking') {
    notify.info('Update is downloading in the background')
    return
  }

  if (result === 'not-supported') {
    notify.error('Service Worker not supported')
    return
  }

  if (result === 'not-registered') {
    notify.warning('Service Worker not registered')
    return
  }

  notify.error(pwaUpdateStore.lastError ?? 'Error checking for updates')
}

async function applyUpdate() {
  const result = await pwaUpdateStore.applyUpdate(route.name)

  if (result === 'blocked-route') {
    notify.warning('Update is ready. Open Home or Settings to apply safely.')
    return
  }

  if (result === 'no-update') {
    notify.info('No update is ready yet')
    return
  }

  if (result === 'checking') {
    notify.info('Update is downloading in the background')
    return
  }

  if (result === 'not-supported') {
    notify.error('Service Worker not supported')
    return
  }

  if (result === 'error') {
    notify.error(pwaUpdateStore.lastError ?? 'Error applying update')
  }
}

// Nostr settings
const relays = ref(nostrStore.relays)
const newRelay = ref('')
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
  nostrStore.setContactSource(contactSourceValue.value)

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
.settings-page {
  max-width: 700px;
  margin: 0 auto;
  padding: calc(var(--vipr-space-4) + env(safe-area-inset-top)) var(--vipr-space-4)
    var(--vipr-space-8);
}

.settings-stack {
  display: flex;
  flex-direction: column;
  gap: var(--vipr-list-gap);
}

.settings-stack--secondary {
  margin-top: var(--vipr-list-gap);
}

.settings-action-full {
  width: 100%;
}

.settings-header {
  font-weight: 600;
}

.danger-header {
  color: var(--q-negative);
}

.settings-panel {
  padding: var(--vipr-settings-panel-padding);
}

.settings-panel--compact {
  padding-top: var(--vipr-space-3);
}

.settings-panel--secondary {
  color: var(--vipr-text-secondary);
}

.settings-panel--danger {
  color: var(--vipr-settings-header-icon-color-danger);
}

.connection-status {
  display: flex;
  align-items: center;
}

.connection-status__icon {
  margin-right: var(--vipr-space-2);
}

.settings-inline-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(140px, 1fr);
  gap: var(--vipr-space-4);
}

.settings-inline-grid--center {
  align-items: center;
}

.settings-inline-grid__main,
.settings-inline-grid__side {
  min-width: 0;
}

.settings-inline-grid__side--end {
  display: flex;
  justify-content: flex-end;
}

.settings-subtitle {
  margin-bottom: var(--vipr-space-1);
  color: var(--vipr-text-primary);
  font-size: 1rem;
  font-weight: 500;
  line-height: var(--vipr-line-height-tight);
}

.settings-section-title {
  margin-bottom: var(--vipr-space-2);
  color: var(--vipr-text-primary);
  font-size: 0.95rem;
  font-weight: 600;
  line-height: var(--vipr-line-height-tight);
}

.settings-caption {
  font-size: var(--vipr-font-size-caption);
  line-height: var(--vipr-line-height-body);
}

.settings-caption--spaced {
  margin-top: var(--vipr-space-1);
}

.settings-block {
  margin-bottom: var(--vipr-space-4);
}

.settings-list--spaced {
  margin-top: var(--vipr-space-4);
}

.settings-relay-actions {
  display: flex;
  flex-direction: column;
  gap: var(--vipr-space-3);
  margin-bottom: var(--vipr-space-4);
}

.settings-relay-reset {
  display: flex;
}

.settings-app-lock-status {
  margin-top: var(--vipr-space-4);
  padding: var(--vipr-space-4);
  border: 1px solid var(--vipr-row-border);
  border-radius: var(--vipr-radius-md);
  background: var(--vipr-surface-card-bg-subtle);
}

.settings-app-lock-actions {
  display: grid;
  gap: var(--vipr-space-3);
  margin-top: var(--vipr-space-4);
}

.settings-access-dialog {
  width: min(92vw, 420px);
  border: 1px solid var(--vipr-dialog-border);
  border-radius: var(--vipr-radius-lg);
  background: var(--vipr-dialog-bg);
  box-shadow: var(--vipr-dialog-shadow);
}

.settings-access-dialog__cancel {
  margin-top: var(--vipr-space-3);
}

.settings-warning,
.settings-error {
  margin-top: var(--vipr-space-2);
  font-size: var(--vipr-font-size-caption);
  line-height: var(--vipr-line-height-body);
}

.settings-warning {
  color: var(--vipr-warning-text);
}

.settings-error {
  color: var(--q-negative);
}

.settings-copy-block {
  padding: var(--vipr-settings-copy-padding);
  color: var(--vipr-text-secondary);
  line-height: var(--vipr-line-height-body);
}

.settings-copy-block--compact {
  margin-bottom: var(--vipr-space-2);
}

.settings-panel--secondary .settings-copy-block {
  padding: var(--vipr-settings-copy-padding-secondary);
  background: transparent;
  border: 0;
}

.settings-panel--secondary .settings-copy-block + .q-btn,
.settings-panel--secondary .settings-copy-block + div {
  margin-top: var(--vipr-settings-copy-action-gap);
}

.settings-panel :deep(.q-btn:not(.q-btn--round):not(.q-btn--dense)) {
  min-height: var(--vipr-size-touch-min);
  border-radius: var(--vipr-radius-control);
  font-weight: 600;
  letter-spacing: 0;
}

.settings-panel :deep(.q-btn.bg-primary),
.settings-panel :deep(.q-btn.text-primary:not(.q-btn--flat):not(.q-btn--outline)) {
  background: var(--vipr-gradient-primary) !important;
  color: var(--vipr-text-primary) !important;
  box-shadow: var(--vipr-shadow-primary-subtle);
}

.settings-panel :deep(.q-btn.q-btn--outline) {
  background: var(--vipr-settings-outline-button-bg);
  box-shadow: var(--vipr-settings-outline-button-shadow);
}

.settings-panel :deep(.q-btn.bg-negative) {
  box-shadow: var(--vipr-settings-danger-button-shadow);
}

.contacts-section {
  max-width: none;
}

.contacts-source-toggle {
  display: block;
}

.contacts-actions {
  margin-top: var(--vipr-space-4);
}

.contacts-action-secondary {
  margin-top: var(--vipr-space-2);
}

.contacts-summary {
  margin-top: var(--vipr-space-4);
  min-height: var(--vipr-space-5);
}

.settings-contact-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--vipr-space-2);
  margin-top: var(--vipr-space-2);
}

.empty-contact-avatar {
  width: var(--vipr-space-8);
  height: var(--vipr-space-8);
  border-radius: var(--vipr-radius-pill);
  background: var(--vipr-settings-empty-avatar-bg);
  border: 1px solid var(--vipr-settings-empty-avatar-border);
  position: relative;
}

.empty-contact-avatar::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 8px;
  width: 10px;
  height: 10px;
  border-radius: var(--vipr-radius-pill);
  background: var(--vipr-settings-empty-avatar-head-bg);
  transform: translateX(-50%);
}

.empty-contact-avatar::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 6px;
  width: var(--vipr-space-4);
  height: 8px;
  border-radius: var(--vipr-radius-pill) var(--vipr-radius-pill) var(--vipr-space-2)
    var(--vipr-space-2);
  background: var(--vipr-settings-empty-avatar-body-bg);
  transform: translateX(-50%);
}

.relay-input :deep(.q-field__bottom) {
  padding: var(--vipr-space-1) var(--vipr-space-3) var(--vipr-space-0);
}

.rounded-borders {
  border-radius: var(--vipr-radius-input);
  background: var(--vipr-list-bg);
  border: 1px solid var(--vipr-list-border);
}

.rounded-borders :deep(.q-item__section--avatar) {
  min-width: 42px;
}

.settings-list :deep(.q-item) {
  background: transparent;
}

.settings-section {
  overflow: hidden;
}

.settings-section :deep(.q-expansion-item__container) {
  border-radius: var(--vipr-radius-card);
  border: 1px solid var(--vipr-list-border);
  overflow: hidden;
}

.settings-section--primary :deep(.q-expansion-item__container) {
  background: var(--vipr-settings-section-bg-primary);
}

.settings-section--secondary :deep(.q-expansion-item__container) {
  background: var(--vipr-settings-section-bg-secondary);
}

.settings-section--danger :deep(.q-expansion-item__container) {
  background: var(--vipr-settings-section-bg-danger);
  border-color: var(--vipr-settings-section-border-danger);
}

.settings-section :deep(.q-item) {
  min-height: var(--vipr-row-min-height);
  padding: var(--vipr-row-padding-y) var(--vipr-row-padding-x);
}

.settings-section :deep(.q-item__label) {
  color: var(--vipr-text-primary);
}

.settings-section :deep(.q-item__label--caption) {
  margin-top: calc(var(--vipr-space-1) / 2);
  font-size: 0.95rem;
  line-height: 1.25;
  color: var(--vipr-text-soft);
}

.settings-section :deep(.q-item__section--avatar) {
  min-width: 46px;
}

.settings-section :deep(.q-expansion-item__container > .q-item .q-item__section--avatar .q-icon) {
  width: 36px;
  height: 36px;
  border-radius: var(--vipr-radius-sm);
  display: grid;
  place-items: center;
  background: var(--vipr-row-icon-bg);
  color: var(--vipr-text-primary);
}

.settings-section--secondary
  :deep(.q-expansion-item__container > .q-item .q-item__section--avatar .q-icon) {
  background: transparent;
  color: var(--vipr-settings-header-icon-color-secondary);
}

.settings-section--danger
  :deep(.q-expansion-item__container > .q-item .q-item__section--avatar .q-icon) {
  background: transparent;
  color: var(--vipr-settings-header-icon-color-danger);
}

.settings-section :deep(.q-expansion-item__toggle-icon) {
  color: var(--vipr-settings-toggle-icon-color);
}

.settings-section :deep(.q-expansion-item__content) {
  background: transparent;
  border-top: 1px solid var(--vipr-color-input-border);
}

.settings-section :deep(.q-card) {
  background: transparent;
  box-shadow: none;
}

.settings-section :deep(.q-item__section--side) .q-btn {
  margin-right: -8px;
}

.settings-section :deep(.q-expansion-item__content .q-item) {
  padding: var(--vipr-space-2) var(--vipr-space-3);
}

.settings-muted {
  color: var(--vipr-text-muted);
}

.settings-contact-placeholder-icon {
  color: var(--vipr-text-muted);
}

.settings-disconnected-icon {
  color: var(--vipr-text-soft);
}

/* Responsive adjustments */
@media (max-width: 599px) {
  .settings-inline-grid {
    grid-template-columns: 1fr;
  }

  .settings-inline-grid__side--end {
    justify-content: flex-start;
  }

  .contacts-section {
    max-width: none;
  }

  .settings-panel {
    padding: var(--vipr-settings-panel-padding-mobile);
  }

  .settings-section :deep(.q-item) {
    min-height: 70px;
    padding: var(--vipr-space-3) var(--vipr-space-4);
  }
}
</style>
