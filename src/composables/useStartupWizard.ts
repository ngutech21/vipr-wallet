import { computed, ref, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppNotify } from 'src/composables/useAppNotify'
import { useWalletStore } from 'src/stores/wallet'
import { useOnboardingStore } from 'src/stores/onboarding'
import { useFederationStore } from 'src/stores/federation'
import { useFederationSelection } from 'src/composables/useFederationSelection'
import { logger } from 'src/services/logger'
import { getErrorMessage } from 'src/utils/error'
import type { Federation } from 'src/types/federation'
import {
  addRestoreFederationEntry as appendRestoreFederationEntry,
  mapRestoreFederationStatuses,
  normalizeRestoreWords,
  removeRestoreFederationEntry as removeRestoreFederationEntryById,
  resolveStartupWizardStep,
  type RestoreFederationEntry,
  type StartupWizardStep,
} from 'src/utils/startupWizardState'

export type WizardStep = StartupWizardStep

type WizardAction = 'idle' | 'creating' | 'restoring'

export function useStartupWizard({ showInstallStep }: { showInstallStep: Ref<boolean> }) {
  const router = useRouter()
  const walletStore = useWalletStore()
  const onboardingStore = useOnboardingStore()
  const federationStore = useFederationStore()
  const federationSelection = useFederationSelection()
  const notify = useAppNotify()

  const currentStep = ref<WizardStep>('welcome')
  const wizardAction = ref<WizardAction>('idle')
  const isRestoringFederation = ref(false)
  const restoreWords = ref<string[]>(Array.from({ length: 12 }, () => ''))
  const restoreFederationInviteCode = ref('')
  const restoreFederationPreview = ref<Federation | null>(null)
  const restoreFederationEntries = ref<RestoreFederationEntry[]>([])

  const mnemonicWords = computed(() => walletStore.mnemonicWords)
  const restoreFederationStatuses = computed(() =>
    mapRestoreFederationStatuses(restoreFederationEntries.value, {
      recoveryStatusByFederationId: walletStore.recoveryStatusByFederationId,
      recoveryFederationId: walletStore.recoveryFederationId,
      recoveryError: walletStore.recoveryError,
    }),
  )
  const isCreating = computed(() => wizardAction.value === 'creating')
  const isRestoring = computed(() => wizardAction.value === 'restoring')
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

    const resolution = resolveStartupWizardStep(
      {
        hasMnemonic: walletStore.hasMnemonic,
        needsMnemonicBackup: walletStore.needsMnemonicBackup,
      },
      {
        flow: onboardingStore.flow,
        step: onboardingStore.step,
        status: onboardingStore.status,
      },
      showInstallStep.value,
    )

    if (resolution.type === 'enter-app') {
      await finishWizardAndEnterApp()
      return
    }

    currentStep.value = resolution.step
    onboardingStore.markInProgress()
    onboardingStore.goToStep(resolution.step)
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
    if (wizardAction.value !== 'idle') {
      return
    }

    if (isCreateLocked.value) {
      onboardingStore.markInProgress()
      onboardingStore.goToStep('backup')
      currentStep.value = 'backup'
      return
    }

    if (!(walletStore.hasMnemonic && walletStore.needsMnemonicBackup)) {
      wizardAction.value = 'creating'
      try {
        await walletStore.createMnemonic()
      } catch (error) {
        notify.error(`Failed to create wallet: ${getErrorMessage(error)}`)
        onboardingStore.goToStep('welcome')
        currentStep.value = 'welcome'
        return
      } finally {
        if (wizardAction.value === 'creating') {
          wizardAction.value = 'idle'
        }
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
    if (wizardAction.value !== 'idle') {
      return
    }

    const words = normalizeRestoreWords(restoreWords.value)

    if (words.length !== 12 || words.some((word) => word === '')) {
      notify.warning('Please enter all 12 recovery words.')
      return
    }

    wizardAction.value = 'restoring'
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
      if (wizardAction.value === 'restoring') {
        wizardAction.value = 'idle'
      }
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

    if (isRestoreFederationRecoveryRunning.value) {
      notify.warning('Please wait until wallet recovery finishes.')
      return
    }

    isRestoringFederation.value = true
    addRestoreFederationEntry(federation)
    walletStore.markFederationRecoveryStatus(federation.federationId, 'restoring')
    restoreFederationPreview.value = null

    try {
      federationStore.addFederation(federation)
      try {
        await federationSelection.selectFederation(federation, {
          expectRecovery: true,
          recoverOnJoin: true,
        })
      } catch (error) {
        federationStore.deleteFederation(federation.federationId)
        throw error
      }

      restoreFederationInviteCode.value = ''
    } catch (error) {
      removeRestoreFederationEntry(federation.federationId)
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

    restoreFederationEntries.value = appendRestoreFederationEntry(
      restoreFederationEntries.value,
      federation,
    )
  }

  function removeRestoreFederationEntry(federationId: string) {
    restoreFederationEntries.value = removeRestoreFederationEntryById(
      restoreFederationEntries.value,
      federationId,
    )
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
