import { computed, ref, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppNotify } from 'src/composables/useAppNotify'
import { useWalletStore } from 'src/stores/wallet'
import { useOnboardingStore } from 'src/stores/onboarding'
import { useFederationStore } from 'src/stores/federation'
import { logger } from 'src/services/logger'
import { getErrorMessage } from 'src/utils/error'
import type { Federation } from 'src/types/federation'

export type WizardStep =
  | 'install'
  | 'welcome'
  | 'custody'
  | 'federation'
  | 'backup'
  | 'restore'
  | 'restore-federations'
  | 'done'

export type RestoreFederationEntry = {
  federationId: string
  title: string
  inviteCode: string
}

export function useStartupWizard({ showInstallStep }: { showInstallStep: Ref<boolean> }) {
  const router = useRouter()
  const walletStore = useWalletStore()
  const onboardingStore = useOnboardingStore()
  const federationStore = useFederationStore()
  const notify = useAppNotify()

  const currentStep = ref<WizardStep>('welcome')
  const isCreating = ref(false)
  const isRestoring = ref(false)
  const isRestoringFederation = ref(false)
  const restoreWords = ref<string[]>(Array.from({ length: 12 }, () => ''))
  const restoreFederationInviteCode = ref('')
  const restoreFederationPreview = ref<Federation | null>(null)
  const restoreFederationEntries = ref<RestoreFederationEntry[]>([])

  const mnemonicWords = computed(() => walletStore.mnemonicWords)
  const restoreFederationStatuses = computed(() =>
    restoreFederationEntries.value.map((entry) => ({
      ...entry,
      status: walletStore.recoveryStatusByFederationId[entry.federationId] ?? 'restoring',
      error:
        walletStore.recoveryFederationId === entry.federationId ? walletStore.recoveryError : null,
    })),
  )
  const isCreateLocked = computed(
    () =>
      onboardingStore.status === 'in_progress' &&
      onboardingStore.flow === 'create' &&
      walletStore.hasMnemonic &&
      walletStore.needsMnemonicBackup,
  )
  const isRestoreFederationRecoveryRunning = computed(() =>
    restoreFederationStatuses.value.some((entry) => entry.status === 'restoring'),
  )

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
      onboardingStore.step === 'restore-federations'
    ) {
      currentStep.value = 'restore-federations'
      onboardingStore.markInProgress()
      onboardingStore.goToStep('restore-federations')
      return
    }

    if (walletStore.hasMnemonic && !walletStore.needsMnemonicBackup) {
      await finishWizardAndEnterApp()
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
      if (walletStore.wallet == null) {
        await walletStore.openWallet()
      } else if (!walletStore.recoveryInProgress) {
        await walletStore.updateBalance()
      }
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
      restoreFederationInviteCode.value = ''
      restoreFederationPreview.value = null
      restoreFederationEntries.value = []
      onboardingStore.goToStep('restore-federations')
      currentStep.value = 'restore-federations'
    } catch (error) {
      notify.error(`Failed to restore wallet: ${getErrorMessage(error)}`)
    } finally {
      isRestoring.value = false
    }
  }

  function updateRestoreFederationInviteCode(value: string | number | null) {
    restoreFederationInviteCode.value = typeof value === 'string' ? value : ''
    restoreFederationPreview.value = null
  }

  async function pasteRestoreFederationFromClipboard() {
    try {
      restoreFederationInviteCode.value = await navigator.clipboard.readText()
      restoreFederationPreview.value = null
    } catch (error) {
      notify.error(`Unable to access clipboard ${getErrorMessage(error)}`)
    }
  }

  async function loadRestoreFederationPreview() {
    const cleanInviteCode = restoreFederationInviteCode.value.trim()
    if (cleanInviteCode === '') {
      notify.warning('Please enter a federation join code.')
      return
    }

    isRestoringFederation.value = true
    try {
      if (
        federationStore.federations.some((federation) => federation.inviteCode === cleanInviteCode)
      ) {
        notify.warning('Federation already added for restore.')
        return
      }

      const federation = await walletStore.previewFederation(cleanInviteCode)
      if (federation == null) {
        notify.error('Failed to preview federation.')
        return
      }

      if (
        restoreFederationEntries.value.some(
          (entry) => entry.federationId === federation.federationId,
        ) ||
        federationStore.federations.some((entry) => entry.federationId === federation.federationId)
      ) {
        notify.warning('Federation already added for restore.')
        return
      }

      restoreFederationPreview.value = federation
    } catch (error) {
      notify.error(`Failed to preview federation: ${getErrorMessage(error)}`)
    } finally {
      isRestoringFederation.value = false
    }
  }

  function backToRestoreFederationInvite() {
    restoreFederationPreview.value = null
  }

  async function submitRestoreFederation() {
    const federation = restoreFederationPreview.value
    if (federation == null) {
      return
    }

    isRestoringFederation.value = true
    addRestoreFederationEntry(federation)
    walletStore.markFederationRecoveryStatus(federation.federationId, 'restoring')
    restoreFederationPreview.value = null

    try {
      federationStore.addFederation(federation)
      try {
        await federationStore.selectFederation(federation, {
          expectRecovery: true,
          recoverOnJoin: true,
        })
      } catch (error) {
        federationStore.deleteFederation(federation.federationId)
        throw error
      }

      restoreFederationInviteCode.value = ''
    } catch (error) {
      walletStore.markFederationRecoveryStatus(
        federation.federationId,
        'failed',
        getErrorMessage(error),
      )
      notify.error(`Failed to restore federation: ${getErrorMessage(error)}`)
    } finally {
      isRestoringFederation.value = false
    }
  }

  function addRestoreFederationEntry(federation: Federation) {
    if (
      restoreFederationEntries.value.some((entry) => entry.federationId === federation.federationId)
    ) {
      return
    }

    restoreFederationEntries.value = [
      ...restoreFederationEntries.value,
      {
        federationId: federation.federationId,
        title: federation.title,
        inviteCode: federation.inviteCode,
      },
    ]
  }

  function backFromRestoreFederations() {
    onboardingStore.markInProgress()
    onboardingStore.goToStep('restore')
    currentStep.value = 'restore'
    restoreFederationInviteCode.value = ''
    restoreFederationPreview.value = null
    restoreFederationEntries.value = []
  }

  function finishRestoreFederations() {
    if (isRestoreFederationRecoveryRunning.value) {
      notify.warning('Please wait until wallet recovery finishes.')
      return
    }

    onboardingStore.goToStep('done')
    currentStep.value = 'done'
  }

  async function skipRestoreFederations() {
    await finishWizardAndEnterApp()
  }

  return {
    currentStep,
    finishBackup,
    finishWizardAndEnterApp,
    goToFederationStep,
    isCreating,
    isCreateLocked,
    isRestoreFederationRecoveryRunning,
    isRestoring,
    isRestoringFederation,
    mnemonicWords,
    restoreFederationInviteCode,
    restoreFederationPreview,
    restoreFederationStatuses,
    restoreWords,
    backFromBackup,
    backFromRestore,
    backFromRestoreFederations,
    backToRestoreFederationInvite,
    backToCustody,
    backToWelcome,
    continueFromFederation,
    continueFromInstall,
    finishRestoreFederations,
    initializeWizard,
    loadRestoreFederationPreview,
    pasteRestoreFederationFromClipboard,
    skipCreateEducation,
    skipRestoreFederations,
    startCreateFlow,
    startRestoreFlow,
    submitRestoreFederation,
    submitRestore,
    updateRestoreFederationInviteCode,
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
