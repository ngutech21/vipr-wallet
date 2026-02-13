<route lang="yaml">
meta:
  hideBottomNav: true
</route>

<template>
  <q-page class="dark-gradient q-pa-md" data-testid="startup-wizard-page">
    <div class="wizard-container">
      <q-card flat bordered class="wizard-card">
        <q-card-section>
          <div class="text-h5 text-center q-mb-xs">Wallet Setup</div>
          <div class="text-caption text-grey-6 text-center q-mb-md">
            Set up a new wallet or restore one from your recovery words.
          </div>

          <q-stepper
            v-model="currentStep"
            animated
            flat
            color="primary"
            class="wizard-stepper"
            header-nav
          >
            <q-step
              name="choice"
              title="Get Started"
              icon="account_balance_wallet"
              :done="currentStep !== 'choice'"
            >
              <div class="text-body1 q-mb-md">
                Choose how you want to continue with your wallet on this device.
              </div>
              <q-btn
                label="Create New Wallet"
                color="primary"
                icon="add"
                class="full-width q-mb-sm"
                :loading="isCreating"
                :disable="isCreating || isRestoring"
                @click="selectCreateWallet"
                data-testid="startup-wizard-create-btn"
              />
              <q-btn
                label="Restore From Backup"
                outline
                color="primary"
                icon="settings_backup_restore"
                class="full-width"
                :disable="isCreating || isRestoring"
                @click="selectRestoreWallet"
                data-testid="startup-wizard-restore-btn"
              />
            </q-step>

            <q-step
              name="backup"
              title="Backup Words"
              icon="shield"
              :done="false"
              :header-nav="false"
            >
              <div class="text-body2 q-mb-md">
                Write down these 12 words in order. They are the only way to recover your wallet.
              </div>

              <div class="words-grid q-mb-md">
                <q-card v-for="(word, index) in mnemonicWords" :key="index" flat bordered>
                  <q-card-section class="q-pa-sm">
                    <div class="text-caption text-grey-7">{{ index + 1 }}</div>
                    <div class="text-subtitle2 text-weight-medium word-text">{{ word }}</div>
                  </q-card-section>
                </q-card>
              </div>

              <q-btn
                label="I've Backed Up My Words"
                color="primary"
                icon="check_circle"
                class="full-width"
                :disable="mnemonicWords.length !== 12"
                @click="confirmBackupAndFinish"
                data-testid="startup-wizard-backup-confirm-btn"
              />
            </q-step>

            <q-step
              name="restore"
              title="Restore Wallet"
              icon="restore"
              :done="false"
              :header-nav="false"
            >
              <div class="text-body2 q-mb-md">
                Enter your 12 recovery words in order to restore your wallet.
              </div>

              <div class="restore-grid q-mb-md">
                <q-input
                  v-for="(_, index) in restoreWords"
                  :key="index"
                  v-model="restoreWords[index]"
                  :label="`${index + 1}`"
                  outlined
                  dense
                  autocomplete="off"
                  autocapitalize="off"
                  spellcheck="false"
                  :disable="isRestoring"
                  :data-testid="`startup-wizard-restore-word-${index + 1}`"
                />
              </div>

              <div class="row q-col-gutter-sm">
                <div class="col-12 col-sm-6">
                  <q-btn
                    label="Back"
                    flat
                    color="grey-7"
                    class="full-width"
                    :disable="isRestoring"
                    @click="backToChoice"
                    data-testid="startup-wizard-restore-back-btn"
                  />
                </div>
                <div class="col-12 col-sm-6">
                  <q-btn
                    label="Restore Wallet"
                    color="primary"
                    class="full-width"
                    :loading="isRestoring"
                    :disable="isCreating || isRestoring"
                    @click="submitRestore"
                    data-testid="startup-wizard-restore-submit-btn"
                  />
                </div>
              </div>
            </q-step>
          </q-stepper>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
defineOptions({
  name: 'StartupWizardPage',
})

import { computed, onMounted, ref } from 'vue'
import { Notify } from 'quasar'
import { useRouter } from 'vue-router'
import { getErrorMessage } from 'src/utils/error'
import { useWalletStore } from 'src/stores/wallet'
import { useOnboardingStore } from 'src/stores/onboarding'
import { logger } from 'src/services/logger'

type WizardStep = 'choice' | 'backup' | 'restore'

const router = useRouter()
const walletStore = useWalletStore()
const onboardingStore = useOnboardingStore()

const currentStep = ref<WizardStep>('choice')
const isCreating = ref(false)
const isRestoring = ref(false)
const restoreWords = ref<string[]>(Array.from({ length: 12 }, () => ''))

const mnemonicWords = computed(() => walletStore.mnemonicWords)

onMounted(() => {
  initializeWizard().catch((error) => {
    Notify.create({
      color: 'negative',
      icon: 'error',
      position: 'top',
      message: `Failed to initialize startup wizard: ${getErrorMessage(error)}`,
    })
  })
})

async function initializeWizard() {
  const hasMnemonic = await walletStore.loadMnemonic()
  onboardingStore.normalizeForMnemonicState(hasMnemonic)

  if (onboardingStore.isBackupPending && walletStore.needsMnemonicBackup) {
    currentStep.value = 'backup'
    return
  }

  if (!walletStore.hasMnemonic && onboardingStore.step === 'restore') {
    onboardingStore.startRestoreFlow()
    currentStep.value = 'restore'
    return
  }

  if (!walletStore.hasMnemonic) {
    onboardingStore.goToChoice()
    currentStep.value = 'choice'
    return
  }

  await finishWizardAndEnterApp()
}

async function finishWizardAndEnterApp() {
  onboardingStore.complete()
  try {
    await walletStore.openWallet()
  } catch (error) {
    logger.warn('Opening wallet after onboarding failed', {
      reason: getErrorMessage(error),
    })
  }
  await router.replace('/')
}

async function selectCreateWallet() {
  isCreating.value = true
  try {
    await walletStore.createMnemonic()
    onboardingStore.startCreateFlow()
    currentStep.value = 'backup'
  } catch (error) {
    Notify.create({
      color: 'negative',
      icon: 'error',
      position: 'top',
      message: `Failed to create wallet: ${getErrorMessage(error)}`,
    })
  } finally {
    isCreating.value = false
  }
}

function selectRestoreWallet() {
  onboardingStore.startRestoreFlow()
  currentStep.value = 'restore'
}

function backToChoice() {
  onboardingStore.goToChoice()
  currentStep.value = 'choice'
  restoreWords.value = Array.from({ length: 12 }, () => '')
}

async function confirmBackupAndFinish() {
  walletStore.markMnemonicBackupConfirmed()
  await finishWizardAndEnterApp()
}

async function submitRestore() {
  const words = restoreWords.value.map((word) => word.trim().toLowerCase())

  if (words.length !== 12 || words.some((word) => word === '')) {
    Notify.create({
      color: 'warning',
      icon: 'warning',
      position: 'top',
      message: 'Please enter all 12 recovery words.',
    })
    return
  }

  isRestoring.value = true
  try {
    await walletStore.restoreMnemonic(words)
    await finishWizardAndEnterApp()
  } catch (error) {
    Notify.create({
      color: 'negative',
      icon: 'error',
      position: 'top',
      message: `Failed to restore wallet: ${getErrorMessage(error)}`,
    })
  } finally {
    isRestoring.value = false
  }
}
</script>

<style scoped>
.wizard-container {
  max-width: 760px;
  margin: 0 auto;
}

.wizard-card {
  border-radius: 14px;
}

.wizard-stepper {
  background: transparent;
}

.words-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.restore-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.word-text {
  font-family: 'Courier New', monospace;
}

.full-width {
  width: 100%;
}

@media (max-width: 599px) {
  .restore-grid,
  .words-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
