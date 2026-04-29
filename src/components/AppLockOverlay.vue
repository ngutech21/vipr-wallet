<template>
  <div
    v-if="appLockStore.shouldShowLock"
    class="app-lock-overlay"
    role="dialog"
    aria-modal="true"
    aria-label="Unlock Vipr"
    data-testid="app-lock-overlay"
  >
    <div class="app-lock-overlay__panel vipr-flow-panel vipr-flow-panel--padded">
      <div v-if="showBiometricAction && !showPinUnlock" class="app-lock-overlay__biometric">
        <q-icon name="fingerprint" class="app-lock-overlay__biometric-icon" />
        <div class="app-lock-overlay__title">Vipr is locked</div>
        <div class="app-lock-overlay__subtitle">Unlock with Face ID / Touch ID.</div>
        <q-btn
          label="Unlock with Face ID / Touch ID"
          icon="fingerprint"
          color="primary"
          no-caps
          unelevated
          class="vipr-btn vipr-btn--primary vipr-btn--lg app-lock-overlay__biometric-btn"
          :loading="biometricUnlocking"
          :disable="biometricUnlocking"
          @click="unlockWithBiometric"
          data-testid="app-lock-biometric-unlock-btn"
        />

        <q-btn
          label="Enter PIN"
          flat
          no-caps
          class="app-lock-overlay__pin-toggle"
          :disable="biometricUnlocking"
          @click="showPinUnlock = true"
          data-testid="app-lock-show-pin-btn"
        />
      </div>

      <AppLockPinEntry
        v-if="showPinUnlock"
        mode="verify"
        title="Enter PIN"
        subtitle="Use your PIN to unlock Vipr."
        confirm-submit-label="Unlock"
        icon="lock"
        :on-submit="appLockStore.unlockWithPin"
        @success="clearBiometricError"
        data-testid="app-lock-pin-unlock"
      />

      <div
        v-if="biometricError"
        class="app-lock-overlay__error"
        data-testid="app-lock-biometric-error"
      >
        {{ biometricError }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import AppLockPinEntry from 'src/components/AppLockPinEntry.vue'
import { useAppLockStore } from 'src/stores/app-lock'

const appLockStore = useAppLockStore()
const biometricUnlocking = ref(false)
const biometricError = ref('')
const showBiometricAction = computed(() => appLockStore.isBiometricEnabled)
const showPinUnlock = ref(!showBiometricAction.value)

function handleVisibilityChange(): void {
  if (typeof document === 'undefined') {
    return
  }

  if (document.visibilityState === 'hidden') {
    appLockStore.markBackgrounded()
    return
  }

  if (document.visibilityState === 'visible') {
    appLockStore.handleVisible()
  }
}

async function unlockWithBiometric(): Promise<void> {
  biometricUnlocking.value = true
  biometricError.value = ''
  const ok = await appLockStore.unlockWithBiometric()
  biometricUnlocking.value = false

  if (!ok) {
    biometricError.value = 'Face ID / Touch ID did not unlock Vipr. Enter your PIN instead.'
  }
}

function clearBiometricError(): void {
  biometricError.value = ''
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }
})

watch(
  () => appLockStore.shouldShowLock,
  (shouldShowLock) => {
    if (!shouldShowLock) {
      return
    }

    showPinUnlock.value = !showBiometricAction.value
    biometricError.value = ''
  },
)

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
})
</script>

<style scoped>
.app-lock-overlay {
  position: fixed;
  z-index: 5000;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(var(--vipr-space-4) + env(safe-area-inset-top)) var(--vipr-space-4)
    calc(var(--vipr-space-4) + env(safe-area-inset-bottom));
  background: var(--vipr-color-page);
}

.app-lock-overlay__panel {
  width: min(100%, 420px);
  max-height: 100%;
  overflow-y: auto;
  background: var(--vipr-surface-card-bg);
  border: 1px solid var(--vipr-surface-card-border-subtle);
  box-shadow: var(--vipr-surface-card-shadow);
}

.app-lock-overlay__biometric {
  margin-bottom: var(--vipr-space-6);
  text-align: center;
}

.app-lock-overlay__biometric-icon {
  display: inline-flex;
  width: 56px;
  height: 56px;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--vipr-space-3);
  border-radius: var(--vipr-radius-round);
  background: var(--vipr-row-icon-bg);
  color: var(--vipr-text-primary);
  font-size: 32px;
}

.app-lock-overlay__title {
  color: var(--vipr-text-primary);
  font-size: var(--vipr-font-size-title);
  font-weight: 700;
  line-height: 1.2;
}

.app-lock-overlay__subtitle {
  margin-top: var(--vipr-space-2);
  color: var(--vipr-text-secondary);
  font-size: var(--vipr-font-size-body);
  line-height: 1.45;
}

.app-lock-overlay__biometric-btn {
  width: 100%;
  margin-top: var(--vipr-space-5);
}

.app-lock-overlay__pin-toggle {
  margin-top: var(--vipr-space-3);
  color: var(--vipr-text-secondary);
  font-size: var(--vipr-font-size-body-sm);
}

.app-lock-overlay__error {
  margin-top: var(--vipr-space-4);
  color: var(--q-negative);
  font-size: var(--vipr-font-size-caption);
  text-align: center;
}
</style>
