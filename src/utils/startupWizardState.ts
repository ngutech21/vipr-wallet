import type { OnboardingState } from 'src/stores/onboarding'
import type { FederationRecoveryStatus } from 'src/stores/wallet'
import type { Federation } from 'src/types/federation'

export type StartupWizardStep =
  | 'install'
  | 'welcome'
  | 'custody'
  | 'federation'
  | 'backup'
  | 'restore'
  | 'restore-federations'
  | 'done'

export type StartupWizardWalletState = {
  hasMnemonic: boolean
  needsMnemonicBackup: boolean
}

export type StartupWizardOnboardingState = Pick<OnboardingState, 'flow' | 'step' | 'status'>

export type StartupWizardResolution =
  | {
      type: 'step'
      step: StartupWizardStep
    }
  | {
      type: 'enter-app'
    }

export type RestoreFederationEntry = {
  federationId: string
  title: string
  inviteCode: string
}

export type RestoreFederationStatusEntry = RestoreFederationEntry & {
  status: FederationRecoveryStatus
  error: string | null
}

export type RestoreFederationRecoveryState = {
  recoveryStatusByFederationId: Record<string, FederationRecoveryStatus | undefined>
  recoveryFederationId: string | null
  recoveryError: string | null
}

export function resolveStartupWizardStep(
  walletState: StartupWizardWalletState,
  onboardingState: StartupWizardOnboardingState,
  showInstallStep: boolean,
): StartupWizardResolution {
  if (
    walletState.hasMnemonic &&
    !walletState.needsMnemonicBackup &&
    onboardingState.flow === 'restore' &&
    onboardingState.step === 'restore-federations'
  ) {
    return { type: 'step', step: 'restore-federations' }
  }

  if (walletState.hasMnemonic && !walletState.needsMnemonicBackup) {
    return { type: 'enter-app' }
  }

  if (onboardingState.step === 'backup' && walletState.needsMnemonicBackup) {
    return { type: 'step', step: 'backup' }
  }

  if (!walletState.hasMnemonic && onboardingState.step === 'restore') {
    return { type: 'step', step: 'restore' }
  }

  const resumedStep = getResumableCreateStep(onboardingState.step)
  if (onboardingState.flow === 'create' && resumedStep != null) {
    return { type: 'step', step: resumedStep }
  }

  if (showInstallStep) {
    return { type: 'step', step: 'install' }
  }

  return { type: 'step', step: 'welcome' }
}

export function normalizeRestoreWords(words: readonly string[]): string[] {
  return words.map((word) => word.trim().toLowerCase())
}

export function createRestoreFederationEntry(
  federation: Pick<Federation, 'federationId' | 'title' | 'inviteCode'>,
): RestoreFederationEntry {
  return {
    federationId: federation.federationId,
    title: federation.title,
    inviteCode: federation.inviteCode,
  }
}

export function addRestoreFederationEntry(
  entries: readonly RestoreFederationEntry[],
  federation: Pick<Federation, 'federationId' | 'title' | 'inviteCode'>,
): RestoreFederationEntry[] {
  if (entries.some((entry) => entry.federationId === federation.federationId)) {
    return [...entries]
  }

  return [...entries, createRestoreFederationEntry(federation)]
}

export function removeRestoreFederationEntry(
  entries: readonly RestoreFederationEntry[],
  federationId: string,
): RestoreFederationEntry[] {
  return entries.filter((entry) => entry.federationId !== federationId)
}

export function mapRestoreFederationStatuses(
  entries: readonly RestoreFederationEntry[],
  recoveryState: RestoreFederationRecoveryState,
): RestoreFederationStatusEntry[] {
  return entries.map((entry) => ({
    ...entry,
    status: recoveryState.recoveryStatusByFederationId[entry.federationId] ?? 'restoring',
    error:
      recoveryState.recoveryFederationId === entry.federationId
        ? recoveryState.recoveryError
        : null,
  }))
}

function getResumableCreateStep(
  step: OnboardingState['step'],
): Extract<StartupWizardStep, 'welcome' | 'custody' | 'federation' | 'done'> | null {
  if (isResumableCreateStep(step)) {
    return step
  }

  return null
}

function isResumableCreateStep(
  step: OnboardingState['step'],
): step is Extract<StartupWizardStep, 'welcome' | 'custody' | 'federation' | 'done'> {
  return step === 'welcome' || step === 'custody' || step === 'federation' || step === 'done'
}
