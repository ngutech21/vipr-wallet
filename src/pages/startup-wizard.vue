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

          <q-stepper v-model="currentStep" animated flat color="primary" class="wizard-stepper">
            <q-step
              name="choice"
              title="Get Started"
              icon="account_balance_wallet"
              :done="currentStep !== 'choice'"
              :header-nav="false"
            >
              <div class="text-body1 q-mb-md">
                Choose how you want to continue with your wallet on this device.
              </div>

              <q-btn
                label="Create New Wallet"
                color="primary"
                icon="add"
                class="full-width q-mb-sm"
                :outline="selectedFlow !== 'create'"
                :disable="isCreating || isRestoring"
                @click="selectFlow('create')"
                data-testid="startup-wizard-create-btn"
              />
              <q-btn
                label="Restore From Backup"
                color="primary"
                icon="settings_backup_restore"
                class="full-width"
                :outline="selectedFlow !== 'restore'"
                :disable="isCreating || isRestoring || isCreateLocked"
                @click="selectFlow('restore')"
                data-testid="startup-wizard-restore-btn"
              />

              <div v-if="isCreateLocked" class="text-caption text-warning q-mt-md">
                Wallet was already created in this setup. Continue backup to proceed.
              </div>

              <div class="row justify-end q-mt-lg">
                <q-btn
                  label="Next"
                  color="primary"
                  :loading="isCreating"
                  :disable="!canProceedFromChoice"
                  @click="goFromChoiceNext"
                  data-testid="startup-wizard-choice-next-btn"
                />
              </div>
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

              <div class="row q-col-gutter-sm">
                <div class="col-12 col-sm-6">
                  <q-btn
                    label="Back"
                    flat
                    color="grey-7"
                    class="full-width"
                    @click="backFromBackupToChoice"
                    data-testid="startup-wizard-backup-back-btn"
                  />
                </div>
                <div class="col-12 col-sm-6">
                  <q-btn
                    label="I've Backed Up My Words"
                    color="primary"
                    icon="check_circle"
                    class="full-width"
                    :disable="mnemonicWords.length !== 12"
                    @click="confirmBackupAndFinish"
                    data-testid="startup-wizard-backup-confirm-btn"
                  />
                </div>
              </div>
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
                    @click="backFromRestoreToChoice"
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
type SelectableFlow = 'create' | 'restore'

const router = useRouter()
const walletStore = useWalletStore()
const onboardingStore = useOnboardingStore()

const currentStep = ref<WizardStep>('choice')
const selectedFlow = ref<SelectableFlow | null>(null)
const isCreating = ref(false)
const isRestoring = ref(false)
const restoreWords = ref<string[]>(Array.from({ length: 12 }, () => ''))

const mnemonicWords = computed(() => walletStore.mnemonicWords)
const isCreateLocked = computed(
  () =>
    onboardingStore.status === 'in_progress' &&
    onboardingStore.flow === 'create' &&
    walletStore.hasMnemonic &&
    walletStore.needsMnemonicBackup,
)
const canProceedFromChoice = computed(() => {
  if (isCreating.value || isRestoring.value) {
    return false
  }
  if (isCreateLocked.value) {
    return true
  }
  return selectedFlow.value != null
})

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
  await walletStore.loadMnemonic()
  onboardingStore.normalizeForWalletState({
    hasMnemonic: walletStore.hasMnemonic,
    needsMnemonicBackup: walletStore.needsMnemonicBackup,
  })

  if (walletStore.hasMnemonic && !walletStore.needsMnemonicBackup) {
    await finishWizardAndEnterApp()
    return
  }

  if (onboardingStore.flow === 'create') {
    selectedFlow.value = 'create'
  } else if (onboardingStore.flow === 'restore') {
    selectedFlow.value = 'restore'
  }

  if (onboardingStore.step === 'backup' && walletStore.needsMnemonicBackup) {
    currentStep.value = 'backup'
    selectedFlow.value = 'create'
    onboardingStore.markInProgress()
    onboardingStore.goToStep('backup')
    return
  }

  if (!walletStore.hasMnemonic && onboardingStore.step === 'restore') {
    currentStep.value = 'restore'
    selectedFlow.value = 'restore'
    onboardingStore.markInProgress()
    onboardingStore.goToStep('restore')
    return
  }

  currentStep.value = 'choice'
  onboardingStore.markInProgress()
  onboardingStore.goToStep('choice')
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

function selectFlow(flow: SelectableFlow) {
  if (isCreateLocked.value && flow === 'restore') {
    return
  }
  selectedFlow.value = flow
}

async function goFromChoiceNext() {
  if (isCreateLocked.value) {
    selectedFlow.value = 'create'
    onboardingStore.markInProgress()
    onboardingStore.goToStep('backup')
    currentStep.value = 'backup'
    return
  }

  if (selectedFlow.value == null) {
    Notify.create({
      color: 'warning',
      icon: 'warning',
      position: 'top',
      message: 'Please choose how to continue.',
    })
    return
  }

  if (selectedFlow.value === 'create') {
    onboardingStore.start('create')

    if (!(walletStore.hasMnemonic && walletStore.needsMnemonicBackup)) {
      isCreating.value = true
      try {
        await walletStore.createMnemonic()
      } catch (error) {
        Notify.create({
          color: 'negative',
          icon: 'error',
          position: 'top',
          message: `Failed to create wallet: ${getErrorMessage(error)}`,
        })
        onboardingStore.goToStep('choice')
        return
      } finally {
        isCreating.value = false
      }
    }

    onboardingStore.goToStep('backup')
    currentStep.value = 'backup'
    return
  }

  onboardingStore.start('restore')
  onboardingStore.goToStep('restore')
  currentStep.value = 'restore'
}

function backFromBackupToChoice() {
  onboardingStore.markInProgress()
  onboardingStore.goToStep('choice')
  currentStep.value = 'choice'
  selectedFlow.value = 'create'
}

function backFromRestoreToChoice() {
  onboardingStore.markInProgress()
  onboardingStore.goToStep('choice')
  currentStep.value = 'choice'
  selectedFlow.value = isCreateLocked.value ? 'create' : 'restore'
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
  onboardingStore.markInProgress()
  onboardingStore.goToStep('restore')
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
