import { defineStore } from 'pinia'

export type OnboardingFlow = 'create' | 'restore' | null
export type OnboardingStatus = 'in_progress' | 'complete'
type FutureOnboardingStep = string & { readonly __futureOnboardingStep: unique symbol }
export type OnboardingStep = 'choice' | 'backup' | 'restore' | FutureOnboardingStep

export type OnboardingState = {
  version: 1
  flow: OnboardingFlow
  step: OnboardingStep
  status: OnboardingStatus
  updatedAt: number
}

export const ONBOARDING_STATE_KEY = 'vipr.onboarding.state'
export const LEGACY_ONBOARDING_FLOW_KEY = 'vipr.onboarding.flow'
export const LEGACY_ONBOARDING_STEP_KEY = 'vipr.onboarding.step'
const ONBOARDING_STATE_VERSION = 1 as const

function createDefaultOnboardingState(): OnboardingState {
  return {
    version: ONBOARDING_STATE_VERSION,
    flow: null,
    step: 'choice',
    status: 'complete',
    updatedAt: Date.now(),
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

function sanitizeFlow(value: unknown): OnboardingFlow {
  if (value === 'create' || value === 'restore') {
    return value
  }
  return null
}

function sanitizeStatus(value: unknown): OnboardingStatus {
  if (value === 'in_progress' || value === 'complete') {
    return value
  }
  return 'complete'
}

function sanitizeStep(value: unknown): OnboardingStep {
  if (value === 'choice' || value === 'backup' || value === 'restore') {
    return value
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return value as FutureOnboardingStep
  }
  return 'choice'
}

function sanitizeUpdatedAt(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value
  }
  return Date.now()
}

export function sanitizeState(value: unknown): OnboardingState {
  if (!isPlainObject(value)) {
    return createDefaultOnboardingState()
  }

  if (value.version !== ONBOARDING_STATE_VERSION) {
    return createDefaultOnboardingState()
  }

  return {
    version: ONBOARDING_STATE_VERSION,
    flow: sanitizeFlow(value.flow),
    step: sanitizeStep(value.step),
    status: sanitizeStatus(value.status),
    updatedAt: sanitizeUpdatedAt(value.updatedAt),
  }
}

export function readOnboardingState(): OnboardingState {
  if (typeof localStorage === 'undefined') {
    return createDefaultOnboardingState()
  }

  // Cold reset legacy persistence format.
  localStorage.removeItem(LEGACY_ONBOARDING_FLOW_KEY)
  localStorage.removeItem(LEGACY_ONBOARDING_STEP_KEY)

  const rawValue = localStorage.getItem(ONBOARDING_STATE_KEY)
  if (rawValue == null || rawValue.trim() === '') {
    return createDefaultOnboardingState()
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown
    return sanitizeState(parsed)
  } catch {
    return createDefaultOnboardingState()
  }
}

export function writeOnboardingState(state: OnboardingState): void {
  if (typeof localStorage === 'undefined') {
    return
  }
  localStorage.setItem(ONBOARDING_STATE_KEY, JSON.stringify(state))
}

export const useOnboardingStore = defineStore('onboarding', {
  state: (): OnboardingState => readOnboardingState(),

  actions: {
    touch() {
      this.updatedAt = Date.now()
      writeOnboardingState({
        version: ONBOARDING_STATE_VERSION,
        flow: this.flow,
        step: this.step,
        status: this.status,
        updatedAt: this.updatedAt,
      })
    },

    start(flow: Exclude<OnboardingFlow, null>) {
      this.flow = flow
      this.status = 'in_progress'
      this.step = flow === 'create' ? 'backup' : 'restore'
      this.touch()
    },

    goToStep(step: OnboardingStep) {
      this.step = step
      this.touch()
    },

    markInProgress() {
      this.status = 'in_progress'
      this.touch()
    },

    complete() {
      this.flow = null
      this.step = 'choice'
      this.status = 'complete'
      this.touch()
    },

    reset() {
      const defaults = createDefaultOnboardingState()
      this.flow = defaults.flow
      this.step = defaults.step
      this.status = defaults.status
      this.updatedAt = defaults.updatedAt
      writeOnboardingState(defaults)
    },

    normalizeForWalletState({
      hasMnemonic,
      needsMnemonicBackup,
    }: {
      hasMnemonic: boolean
      needsMnemonicBackup: boolean
    }) {
      if (!hasMnemonic) {
        if (this.flow === 'create' && this.step === 'backup') {
          this.flow = null
          this.step = 'choice'
          this.status = 'in_progress'
          this.touch()
          return
        }
        if (this.status === 'complete') {
          this.status = 'in_progress'
          this.touch()
        }
        return
      }

      if (needsMnemonicBackup && this.flow === 'create') {
        this.status = 'in_progress'
        this.step = 'backup'
        this.touch()
        return
      }

      this.complete()
    },
  },
})
