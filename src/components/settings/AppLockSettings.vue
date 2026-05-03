<template>
  <SettingsSection variant="secondary" data-testid="settings-app-lock-section">
    <template #header>
      <q-item-section avatar>
        <q-icon name="lock" />
      </q-item-section>
      <q-item-section>
        <q-item-label>App Lock</q-item-label>
        <q-item-label caption>PIN and biometrics</q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-badge class="settings-status-pill" :class="appLockStatusToneClass">
          {{ appLockHeaderStatusLabel }}
        </q-badge>
      </q-item-section>
    </template>

    <div class="settings-copy-block settings-block" data-testid="settings-app-lock-copy">
      Protect Vipr on this device with a local PIN. Face ID / Touch ID can be enabled after a PIN is
      set.
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
  </SettingsSection>

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
</template>

<script setup lang="ts">
defineOptions({
  name: 'AppLockSettings',
})

import { computed, onMounted, ref } from 'vue'
import AppLockPinEntry from 'src/components/AppLockPinEntry.vue'
import SettingsSection from 'src/components/settings/SettingsSection.vue'
import { useAppNotify } from 'src/composables/useAppNotify'
import { logger } from 'src/services/logger'
import { useAppLockStore } from 'src/stores/app-lock'

const appLockStore = useAppLockStore()
const notify = useAppNotify()

const biometricAvailable = ref(false)
const biometricBusy = ref(false)
type AccessDialogMode = 'setup' | 'verify-current-for-change' | 'verify-current-for-remove' | null
const accessDialogMode = ref<AccessDialogMode>(null)
const isAppLockPinConfigured = computed(() => appLockStore.isPinConfigured)
const isBiometricEnabled = computed(() => appLockStore.isBiometricEnabled)
const appLockHeaderStatusLabel = computed(() => {
  if (!isAppLockPinConfigured.value) {
    return 'Off'
  }

  return isBiometricEnabled.value ? 'PIN + Face ID' : 'PIN enabled'
})
const appLockStatusToneClass = computed(() =>
  isAppLockPinConfigured.value ? 'settings-status-pill--positive' : 'settings-status-pill--neutral',
)
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
</script>
