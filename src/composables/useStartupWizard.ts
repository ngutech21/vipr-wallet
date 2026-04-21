import { computed, ref, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppNotify } from 'src/composables/useAppNotify'
import { useWalletStore } from 'src/stores/wallet'
import { useOnboardingStore } from 'src/stores/onboarding'
import { logger } from 'src/services/logger'
import { getErrorMessage } from 'src/utils/error'

export type WizardStep =
  | 'install'
  | 'welcome'
  | 'custody'
  | 'federation'
  | 'backup'
  | 'restore'
  | 'done'

export function useStartupWizard({ showInstallStep }: { showInstallStep: Ref<boolean> }) {
  const router = useRouter()
  const walletStore = useWalletStore()
  const onboardingStore = useOnboardingStore()
  const notify = useAppNotify()

  const currentStep = ref<WizardStep>('welcome')
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

    if (showInstallStep.value && onboardingStore.step === 'install') {
      currentStep.value = 'install'
      onboardingStore.markInProgress()
      onboardingStore.goToStep('install')
      return
    }

    if (onboardingStore.step === 'backup' && walletStore.needsMnemonicBackup) {
      currentStep.value = 'backup'
      onboardingStore.markInProgress()
      onboardingStore.goToStep('backup')
      return
    }

    if (!walletStore.hasMnemonic && onboardingStore.step === 'restore') {
      currentStep.value = 'restore'
      onboardingStore.markInProgress()
      onboardingStore.goToStep('restore')
      return
    }

    const resumedStep = getResumableCreateStep(onboardingStore.step)

    if (onboardingStore.flow === 'create' && resumedStep != null) {
      currentStep.value = resumedStep
      onboardingStore.markInProgress()
      onboardingStore.goToStep(resumedStep)
      return
    }

    if (showInstallStep.value) {
      currentStep.value = 'install'
      onboardingStore.markInProgress()
      onboardingStore.goToStep('install')
      return
    }

    currentStep.value = 'welcome'
    onboardingStore.markInProgress()
    onboardingStore.goToStep('welcome')
  }

  function continueFromInstall() {
    onboardingStore.markInProgress()
    onboardingStore.goToStep('welcome')
    currentStep.value = 'welcome'
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

  function startCreateFlow() {
    onboardingStore.start('create')
    onboardingStore.goToStep('custody')
    currentStep.value = 'custody'
  }

  function startRestoreFlow() {
    onboardingStore.start('restore')
    onboardingStore.goToStep('restore')
    currentStep.value = 'restore'
  }

  function goToFederationStep() {
    onboardingStore.markInProgress()
    onboardingStore.goToStep('federation')
    currentStep.value = 'federation'
  }

  function backToWelcome() {
    onboardingStore.markInProgress()
    onboardingStore.goToStep('welcome')
    currentStep.value = 'welcome'
  }

  function backToCustody() {
    onboardingStore.markInProgress()
    onboardingStore.goToStep('custody')
    currentStep.value = 'custody'
  }

  async function continueFromFederation() {
    if (isCreateLocked.value) {
      onboardingStore.markInProgress()
      onboardingStore.goToStep('backup')
      currentStep.value = 'backup'
      return
    }

    if (!(walletStore.hasMnemonic && walletStore.needsMnemonicBackup)) {
      isCreating.value = true
      try {
        await walletStore.createMnemonic()
      } catch (error) {
        notify.error(`Failed to create wallet: ${getErrorMessage(error)}`)
        onboardingStore.goToStep('welcome')
        currentStep.value = 'welcome'
        return
      } finally {
        isCreating.value = false
      }
    }

    onboardingStore.goToStep('backup')
    currentStep.value = 'backup'
  }

  async function skipCreateEducation() {
    onboardingStore.start('create')
    await continueFromFederation()
  }

  function backFromBackup() {
    onboardingStore.markInProgress()
    onboardingStore.goToStep('federation')
    currentStep.value = 'federation'
  }

  function backFromRestore() {
    onboardingStore.markInProgress()
    onboardingStore.goToStep('welcome')
    currentStep.value = 'welcome'
    restoreWords.value = Array.from({ length: 12 }, () => '')
  }

  function finishBackup() {
    walletStore.markMnemonicBackupConfirmed()
    onboardingStore.goToStep('done')
    currentStep.value = 'done'
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
      onboardingStore.goToStep('done')
      currentStep.value = 'done'
    } catch (error) {
      notify.error(`Failed to restore wallet: ${getErrorMessage(error)}`)
    } finally {
      isRestoring.value = false
    }
  }

  return {
    currentStep,
    finishBackup,
    finishWizardAndEnterApp,
    goToFederationStep,
    isCreating,
    isCreateLocked,
    isRestoring,
    mnemonicWords,
    restoreWords,
    backFromBackup,
    backFromRestore,
    backToCustody,
    backToWelcome,
    continueFromFederation,
    continueFromInstall,
    initializeWizard,
    skipCreateEducation,
    startCreateFlow,
    startRestoreFlow,
    submitRestore,
  }
}

function getResumableCreateStep(
  step: string,
): Extract<WizardStep, 'welcome' | 'custody' | 'federation' | 'done'> | null {
  if (step === 'welcome' || step === 'custody' || step === 'federation' || step === 'done') {
    return step
  }

  return null
}
