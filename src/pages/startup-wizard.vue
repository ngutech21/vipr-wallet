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
              v-if="showInstallStep"
              name="install"
              title="Install App"
              icon="home"
              :done="currentStep !== 'install'"
              :header-nav="false"
            >
              <div
                v-if="installInstruction != null"
                class="install-panel"
                data-testid="startup-wizard-install-panel"
              >
                <div class="install-panel__eyebrow">Recommended setup</div>

                <div class="install-panel__header">
                  <div class="install-panel__icon">
                    <q-icon name="home" size="24px" />
                  </div>

                  <div>
                    <div class="text-h6 q-mb-xs">Add Vipr to your home screen</div>
                    <div class="text-body2 text-grey-5">
                      {{ installHintDescription }}
                    </div>
                  </div>
                </div>

                <div v-if="needsNativeBrowser" class="install-panel__browser-note">
                  Open this page in {{ recommendedBrowserLabel }} to install Vipr from the correct
                  browser.
                </div>

                <div class="install-steps-card">
                  <div class="install-steps-card__title">
                    {{ installInstruction.title }}
                  </div>

                  <div
                    v-for="(step, index) in installInstruction.steps"
                    :key="step"
                    class="install-step"
                  >
                    <div class="install-step__index">{{ index + 1 }}</div>
                    <div class="install-step__text">{{ step }}</div>
                  </div>
                </div>

                <div class="install-panel__footer text-caption text-grey-6">
                  Once Vipr is on your home screen, reopen it from the new icon for the cleanest
                  full-screen experience.
                </div>
              </div>

              <div class="row justify-end q-mt-lg">
                <q-btn
                  label="Continue in Browser"
                  color="primary"
                  @click="continueFromInstall"
                  data-testid="startup-wizard-install-next-btn"
                />
              </div>
            </q-step>

            <q-step
              name="choice"
              title="Get Started"
              icon="account_balance_wallet"
              :done="currentStep === 'backup' || currentStep === 'restore'"
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

import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useAppNotify } from 'src/composables/useAppNotify'
import { useRouter } from 'vue-router'
import { getErrorMessage } from 'src/utils/error'
import { useWalletStore } from 'src/stores/wallet'
import { useOnboardingStore } from 'src/stores/onboarding'
import { logger } from 'src/services/logger'

type WizardStep = 'install' | 'choice' | 'backup' | 'restore'
type SelectableFlow = 'create' | 'restore'
type InstallHintMode = 'android' | 'ios' | 'generic'
type InstallInstruction = {
  title: string
  steps: string[]
}

const router = useRouter()
const walletStore = useWalletStore()
const onboardingStore = useOnboardingStore()
const notify = useAppNotify()

const currentStep = ref<WizardStep>('choice')
const selectedFlow = ref<SelectableFlow | null>(null)
const isCreating = ref(false)
const isRestoring = ref(false)
const restoreWords = ref<string[]>(Array.from({ length: 12 }, () => ''))
const installHintMode = ref<InstallHintMode>('generic')
const isStandaloneApp = ref(false)
const needsNativeBrowser = ref(false)
let standaloneMediaQuery: MediaQueryList | null = null

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
const installInstruction = computed<InstallInstruction>(() => {
  if (installHintMode.value === 'android') {
    return {
      title: 'Install from Chrome on Android',
      steps: [
        'Open the browser menu in the top-right corner.',
        'Choose "Add to Home screen" or "Install app".',
      ],
    }
  }

  if (installHintMode.value === 'ios') {
    return {
      title: 'Install from Safari on iPhone',
      steps: ['Tap Share in Safari.', 'Choose "Add to Home Screen".'],
    }
  }

  return {
    title: 'Install on your phone before setup',
    steps: [
      'On iPhone, open Vipr in Safari, tap Share, then choose "Add to Home Screen".',
      'On Android, open Vipr in Chrome, open the menu, then choose "Add to Home screen" or "Install app".',
    ],
  }
})
const recommendedBrowserLabel = computed(() => {
  if (installHintMode.value === 'android') {
    return 'Chrome on Android'
  }
  if (installHintMode.value === 'ios') {
    return 'Safari on iPhone'
  }
  return 'Safari on iPhone or Chrome on Android'
})
const installHintDescription = computed(() => {
  if (installHintMode.value === 'android') {
    return 'Vipr feels better when it launches like an app from your Android home screen. Install it first, then continue setup from the new icon.'
  }

  if (installHintMode.value === 'ios') {
    return 'Vipr works best when it opens full screen from your iPhone home screen, without Safari bars getting in the way while you set up your wallet.'
  }

  return 'For the best wallet experience, install Vipr to your phone home screen first and continue setup from the app icon after that.'
})
const showInstallStep = computed(() => !isStandaloneApp.value)

onMounted(() => {
  initializeInstallHint()
  initializeWizard().catch((error) => {
    notify.error(`Failed to initialize startup wizard: ${getErrorMessage(error)}`)
  })
})

onBeforeUnmount(() => {
  removeInstallHintListeners()
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

  if (showInstallStep.value && onboardingStore.step === 'install') {
    currentStep.value = 'install'
    onboardingStore.markInProgress()
    onboardingStore.goToStep('install')
    return
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

  if (showInstallStep.value) {
    currentStep.value = 'install'
    onboardingStore.markInProgress()
    onboardingStore.goToStep('install')
    return
  }

  currentStep.value = 'choice'
  onboardingStore.markInProgress()
  onboardingStore.goToStep('choice')
}

function continueFromInstall() {
  onboardingStore.markInProgress()
  onboardingStore.goToStep('choice')
  currentStep.value = 'choice'
}

function initializeInstallHint() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return
  }

  const detectedMode = detectInstallHintMode()
  installHintMode.value = detectedMode
  needsNativeBrowser.value = detectNeedsNativeBrowser(detectedMode)

  if (typeof window.matchMedia === 'function') {
    standaloneMediaQuery = window.matchMedia('(display-mode: standalone)')
  }

  syncStandaloneState()

  if (standaloneMediaQuery == null) {
    return
  }

  if (typeof standaloneMediaQuery.addEventListener === 'function') {
    standaloneMediaQuery.addEventListener('change', syncStandaloneState)
    return
  }

  if (typeof standaloneMediaQuery.addListener === 'function') {
    standaloneMediaQuery.addListener(syncStandaloneState)
  }
}

function removeInstallHintListeners() {
  if (standaloneMediaQuery == null) {
    return
  }

  if (typeof standaloneMediaQuery.removeEventListener === 'function') {
    standaloneMediaQuery.removeEventListener('change', syncStandaloneState)
    return
  }

  if (typeof standaloneMediaQuery.removeListener === 'function') {
    standaloneMediaQuery.removeListener(syncStandaloneState)
  }
}

function detectInstallHintMode(): InstallHintMode {
  const userAgent = navigator.userAgent.toLowerCase()

  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'ios'
  }

  if (/android/.test(userAgent)) {
    return 'android'
  }

  return 'generic'
}

function detectNeedsNativeBrowser(mode: InstallHintMode): boolean {
  const userAgent = navigator.userAgent.toLowerCase()

  if (mode === 'ios') {
    const isSafari =
      /safari/.test(userAgent) && !/crios|fxios|edgios|opr|opera|duckduckgo/.test(userAgent)
    return !isSafari
  }

  if (mode === 'android') {
    const isChrome =
      /chrome|chromium/.test(userAgent) &&
      !/edga|edgios|opr|opera|samsungbrowser|firefox/.test(userAgent)
    return !isChrome
  }

  return false
}

function syncStandaloneState() {
  if (typeof window === 'undefined') {
    isStandaloneApp.value = false
    return
  }

  const standaloneNavigator = navigator as Navigator & { standalone?: boolean }
  const isStandaloneMatch =
    standaloneMediaQuery?.matches ??
    (typeof window.matchMedia === 'function'
      ? window.matchMedia('(display-mode: standalone)').matches
      : false)

  isStandaloneApp.value = Boolean(standaloneNavigator.standalone || isStandaloneMatch)
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

async function goFromChoiceNext() {
  if (isCreateLocked.value) {
    selectedFlow.value = 'create'
    onboardingStore.markInProgress()
    onboardingStore.goToStep('backup')
    currentStep.value = 'backup'
    return
  }

  if (selectedFlow.value == null) {
    notify.warning('Please choose how to continue.')
    return
  }

  if (selectedFlow.value === 'create') {
    onboardingStore.start('create')

    if (!(walletStore.hasMnemonic && walletStore.needsMnemonicBackup)) {
      isCreating.value = true
      try {
        await walletStore.createMnemonic()
      } catch (error) {
        notify.error(`Failed to create wallet: ${getErrorMessage(error)}`)
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
    notify.warning('Please enter all 12 recovery words.')
    return
  }

  isRestoring.value = true
  onboardingStore.markInProgress()
  onboardingStore.goToStep('restore')
  try {
    await walletStore.restoreMnemonic(words)
    await finishWizardAndEnterApp()
  } catch (error) {
    notify.error(`Failed to restore wallet: ${getErrorMessage(error)}`)
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

.install-panel {
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  padding: 18px;
  background: linear-gradient(
    180deg,
    rgba(var(--q-primary-rgb), 0.12),
    rgba(255, 255, 255, 0.03) 42%,
    rgba(255, 255, 255, 0.02)
  );
  border: 1px solid rgba(var(--q-primary-rgb), 0.35);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.22);
}

.install-panel__eyebrow {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  margin-bottom: 14px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #f6ebff;
  background: rgba(var(--q-primary-rgb), 0.22);
}

.install-panel__header {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 14px;
}

.install-panel__icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(var(--q-primary-rgb), 0.28), rgba(0, 0, 0, 0.08));
  color: white;
  border: 1px solid rgba(var(--q-primary-rgb), 0.28);
}

.install-panel__browser-note {
  margin-bottom: 14px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 179, 64, 0.1);
  border: 1px solid rgba(255, 179, 64, 0.24);
  color: #ffd18d;
  font-size: 0.92rem;
}

.install-steps-card {
  padding: 14px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.install-steps-card__title {
  margin-bottom: 12px;
  font-weight: 700;
  color: white;
}

.install-step {
  display: flex;
  gap: 12px;
  align-items: flex-start;

  + .install-step {
    margin-top: 10px;
  }
}

.install-step__index {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border-radius: 999px;
  background: rgba(var(--q-primary-rgb), 0.16);
  border: 1px solid rgba(var(--q-primary-rgb), 0.4);
  color: white;
  font-size: 0.82rem;
  font-weight: 700;
}

.install-step__text {
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.92);
}

.install-panel__footer {
  margin-top: 14px;
  line-height: 1.5;
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
