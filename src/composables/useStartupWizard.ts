import { computed, ref, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { Loading } from 'quasar'
import { useAppNotify } from 'src/composables/useAppNotify'
import { useWalletStore } from 'src/stores/wallet'
import { useOnboardingStore } from 'src/stores/onboarding'
import { useFederationStore } from 'src/stores/federation'
import { logger } from 'src/services/logger'
import { getErrorMessage } from 'src/utils/error'
import type { Federation } from 'src/types/federation'

export type WizardStep = 'install' | 'choice' | 'backup' | 'restore' | 'restore-federation'
export type SelectableFlow = 'create' | 'restore'

export function useStartupWizard({ showInstallStep }: { showInstallStep: Ref<boolean> }) {
  const router = useRouter()
  const walletStore = useWalletStore()
  const onboardingStore = useOnboardingStore()
  const federationStore = useFederationStore()
  const notify = useAppNotify()

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
      onboardingStore.goToStep('restore-federation')
      currentStep.value = 'restore-federation'
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
      notify.notify({
        type: 'negative',
        message: `Unable to access clipboard ${getErrorMessage(error)}`,
      })
    }
  }

  async function loadRestoreFederationPreview() {
    Loading.show({ message: 'Loading federation preview' })
    isRestoringFederation.value = true

    try {
      const cleanInviteCode = restoreFederationInviteCode.value.trim()
      if (federationStore.federations.some((f) => f.inviteCode === cleanInviteCode)) {
        notify.notify({
          message: 'Federation already exists',
          color: 'negative',
          icon: 'error',
          timeout: 5000,
        })
        return
      }

      const federation = await walletStore.previewFederation(cleanInviteCode)
      if (federation != null) {
        restoreFederationPreview.value = federation
      }
    } catch (error) {
      notify.notify({
        message: `Failed to preview federation: ${getErrorMessage(error)}`,
        color: 'negative',
        icon: 'error',
        timeout: 5000,
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
      notify.notify({
        message: `Failed to restore federation: ${getErrorMessage(error)}`,
        color: 'negative',
        icon: 'error',
        timeout: 5000,
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

  return {
    canProceedFromChoice,
    currentStep,
    isCreating,
    isCreateLocked,
    isRestoring,
    isRestoringFederation,
    mnemonicWords,
    restoreWords,
    restoreFederationInviteCode,
    restoreFederationPreview,
    selectedFlow,
    backFromBackupToChoice,
    backFromRestoreToChoice,
    backFromRestoreFederationToRestoreWords,
    confirmBackupAndFinish,
    continueFromInstall,
    goFromChoiceNext,
    goBackToRestoreFederationInvite,
    initializeWizard,
    loadRestoreFederationPreview,
    pasteRestoreFederationFromClipboard,
    skipRestoreFederation,
    submitFederationRestore,
    submitRestore,
    updateRestoreFederationInviteCode,
  }
}
