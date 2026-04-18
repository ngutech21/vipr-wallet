<route lang="yaml">
meta:
  hideBottomNav: true
</route>

<template>
  <q-page class="dark-gradient q-pa-md" data-testid="startup-wizard-page">
    <div class="wizard-container">
      <q-card flat bordered class="wizard-card">
        <q-card-section>
          <div class="text-h5 text-center q-mb-xs">Vipr Wallet Setup</div>
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
                Choose how you want to continue with your wallet on this device
              </div>

              <div class="column q-gutter-y-sm q-mb-sm">
                <q-radio
                  v-model="selectedFlow"
                  val="create"
                  label="Create New Wallet"
                  :disable="isCreating || isRestoring"
                  data-testid="startup-wizard-create-radio"
                />
                <q-radio
                  v-model="selectedFlow"
                  val="restore"
                  label="Restore From Backup"
                  :disable="isCreating || isRestoring || isCreateLocked"
                  data-testid="startup-wizard-restore-radio"
                />
              </div>

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
              icon="settings_backup_restore"
              :done="false"
              :header-nav="false"
            >
              <div class="text-body2 q-mb-md">
                Enter your 12 recovery words in order to restore your wallet.
              </div>
              <div class="text-caption text-warning q-mb-md">
                Recovery words restore your wallet secret. In the next step, you can optionally
                restore one federation with its invite code on this device.
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

            <q-step
              name="restore-federation"
              title="Restore Federation"
              icon="account_balance"
              :done="false"
              :header-nav="false"
            >
              <div class="text-body2 q-mb-md">
                Optionally restore one federation now. You can skip this and add more later from the
                app.
              </div>
              <div class="text-caption text-warning q-mb-md">
                Only federations restored in this step will use the recovery flow. Normal joins stay
                normal joins.
              </div>

              <JoinFederationInviteStep
                v-if="restoreFederationPreview == null"
                :invite-code="restoreFederationInviteCode"
                :is-submitting="isRestoringFederation"
                @update:invite-code="updateRestoreFederationInviteCode"
                @paste="pasteRestoreFederationFromClipboard"
                @submit="loadRestoreFederationPreview"
              />

              <JoinFederationPreviewStep
                v-else
                :federation="restoreFederationPreview"
                :is-submitting="isRestoringFederation"
                submit-label="Restore Federation"
                @back="goBackToRestoreFederationInvite"
                @join="submitFederationRestore"
              />

              <div v-if="restoreFederationPreview == null" class="row q-col-gutter-sm q-mt-md">
                <div class="col-12 col-sm-6">
                  <q-btn
                    label="Back"
                    flat
                    color="grey-7"
                    class="full-width"
                    :disable="isRestoringFederation"
                    @click="backFromRestoreFederationToRestoreWords"
                    data-testid="startup-wizard-restore-federation-back-btn"
                  />
                </div>
                <div class="col-12 col-sm-6">
                  <q-btn
                    label="Skip for Now"
                    color="primary"
                    class="full-width"
                    :disable="isRestoringFederation"
                    @click="skipRestoreFederation"
                    data-testid="startup-wizard-restore-federation-skip-btn"
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

import type { Federation } from 'src/components/models'
import { computed, onMounted, ref } from 'vue'
import { Loading, Notify } from 'quasar'
import { useRouter } from 'vue-router'
import { getErrorMessage } from 'src/utils/error'
import { useWalletStore } from 'src/stores/wallet'
import { useOnboardingStore } from 'src/stores/onboarding'
import { useFederationStore } from 'src/stores/federation'
import { logger } from 'src/services/logger'
import JoinFederationInviteStep from 'src/components/JoinFederationInviteStep.vue'
import JoinFederationPreviewStep from 'src/components/JoinFederationPreviewStep.vue'

type WizardStep = 'choice' | 'backup' | 'restore' | 'restore-federation'
type SelectableFlow = 'create' | 'restore'

const router = useRouter()
const walletStore = useWalletStore()
const onboardingStore = useOnboardingStore()
const federationStore = useFederationStore()

const currentStep = ref<WizardStep>('choice')
const selectedFlow = ref<SelectableFlow | null>(null)
const isCreating = ref(false)
const isRestoring = ref(false)
const isRestoringFederation = ref(false)
const restoreWords = ref<string[]>(Array.from({ length: 12 }, () => ''))
const restoreFederationInviteCode = ref('')
const restoreFederationPreview = ref<Federation | null>(null)

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

  if (
    walletStore.hasMnemonic &&
    !walletStore.needsMnemonicBackup &&
    onboardingStore.flow === 'restore' &&
    onboardingStore.step === 'restore-federation'
  ) {
    currentStep.value = 'restore-federation'
    selectedFlow.value = 'restore'
    onboardingStore.markInProgress()
    onboardingStore.goToStep('restore-federation')
    return
  }

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

async function finishWizardAndEnterApp(options: { openWallet?: boolean } = {}) {
  const { openWallet = true } = options
  onboardingStore.complete()
  if (openWallet) {
    try {
      await walletStore.openWallet()
    } catch (error) {
      logger.warn('Opening wallet after onboarding failed', {
        reason: getErrorMessage(error),
      })
    }
  }
  await router.replace('/')
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
  restoreFederationInviteCode.value = ''
  restoreFederationPreview.value = null
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
    restoreFederationInviteCode.value = ''
    restoreFederationPreview.value = null
    onboardingStore.goToStep('restore-federation')
    currentStep.value = 'restore-federation'
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

function updateRestoreFederationInviteCode(value: string | number | null) {
  restoreFederationInviteCode.value = typeof value === 'string' ? value : ''
  restoreFederationPreview.value = null
}

function backFromRestoreFederationToRestoreWords() {
  onboardingStore.markInProgress()
  onboardingStore.goToStep('restore')
  currentStep.value = 'restore'
  restoreFederationInviteCode.value = ''
  restoreFederationPreview.value = null
}

function goBackToRestoreFederationInvite() {
  restoreFederationPreview.value = null
}

async function pasteRestoreFederationFromClipboard() {
  try {
    restoreFederationInviteCode.value = await navigator.clipboard.readText()
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: `Unable to access clipboard ${getErrorMessage(error)}`,
      position: 'top',
    })
  }
}

async function loadRestoreFederationPreview() {
  Loading.show({ message: 'Loading federation preview' })
  isRestoringFederation.value = true

  try {
    const cleanInviteCode = restoreFederationInviteCode.value.trim()
    if (federationStore.federations.some((f) => f.inviteCode === cleanInviteCode)) {
      Notify.create({
        message: 'Federation already exists',
        color: 'negative',
        icon: 'error',
        timeout: 5000,
        position: 'top',
      })
      return
    }

    const federation = await walletStore.previewFederation(cleanInviteCode)
    if (federation != null) {
      restoreFederationPreview.value = federation
    }
  } catch (error) {
    Notify.create({
      message: `Failed to preview federation: ${getErrorMessage(error)}`,
      color: 'negative',
      icon: 'error',
      timeout: 5000,
      position: 'top',
    })
  } finally {
    isRestoringFederation.value = false
    Loading.hide()
  }
}

async function submitFederationRestore() {
  const federation = restoreFederationPreview.value
  if (federation == null) {
    return
  }

  Loading.show({ message: 'Restoring Federation' })
  isRestoringFederation.value = true

  try {
    federationStore.addFederation(federation, { recover: true })
    try {
      await federationStore.selectFederation(federation)
    } catch (error) {
      federationStore.deleteFederation(federation.federationId)
      throw error
    }
  } catch (error) {
    Notify.create({
      message: `Failed to restore federation: ${getErrorMessage(error)}`,
      color: 'negative',
      icon: 'error',
      timeout: 5000,
      position: 'top',
    })
    return
  } finally {
    isRestoringFederation.value = false
    Loading.hide()
  }

  await finishWizardAndEnterApp({ openWallet: false })
}

async function skipRestoreFederation() {
  await finishWizardAndEnterApp()
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
