import { defineStore } from 'pinia'

export type OnboardingFlow = 'create' | 'restore' | null
export type OnboardingStatus = 'in_progress' | 'complete'
type FutureOnboardingStep = string & { readonly __futureOnboardingStep: unique symbol }
export type OnboardingStep =
  | 'install'
  | 'welcome'
  | 'custody'
  | 'federation'
  | 'backup'
  | 'restore'
  | 'restore-federations'
  | 'done'
  | FutureOnboardingStep

export type OnboardingState = {
  version: 1
  flow: OnboardingFlow
  step: OnboardingStep
  status: OnboardingStatus
  updatedAt: number
}

export type WalletOnboardingState = {
  hasMnemonic: boolean
  needsMnemonicBackup: boolean
}

export const ONBOARDING_STATE_KEY = 'vipr.onboarding.state'
export const LEGACY_ONBOARDING_FLOW_KEY = 'vipr.onboarding.flow'
export const LEGACY_ONBOARDING_STEP_KEY = 'vipr.onboarding.step'
const ONBOARDING_STATE_VERSION = 1 as const

function createDefaultOnboardingState(now = Date.now()): OnboardingState {
  return {
    version: ONBOARDING_STATE_VERSION,
    flow: null,
    step: 'welcome',
    status: 'complete',
    updatedAt: now,
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
  if (
    value === 'install' ||
    value === 'welcome' ||
    value === 'custody' ||
    value === 'federation' ||
    value === 'backup' ||
    value === 'restore' ||
    value === 'restore-federations' ||
    value === 'done'
  ) {
    return value
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return value as FutureOnboardingStep
  }
  return 'welcome'
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

export function resolveOnboardingTouch(state: OnboardingState, now: number): OnboardingState {
  return {
    ...state,
    updatedAt: now,
  }
}

export function resolveOnboardingStart(
  state: OnboardingState,
  flow: Exclude<OnboardingFlow, null>,
  now: number,
): OnboardingState {
  return {
    ...state,
    flow,
    step: flow === 'create' ? 'welcome' : 'restore',
    status: 'in_progress',
    updatedAt: now,
  }
}

export function resolveOnboardingStep(
  state: OnboardingState,
  step: OnboardingStep,
  now: number,
): OnboardingState {
  return {
    ...state,
    step,
    updatedAt: now,
  }
}

export function resolveOnboardingInProgress(state: OnboardingState, now: number): OnboardingState {
  return {
    ...state,
    status: 'in_progress',
    updatedAt: now,
  }
}

export function resolveOnboardingComplete(state: OnboardingState, now: number): OnboardingState {
  return {
    ...state,
    flow: null,
    step: 'welcome',
    status: 'complete',
    updatedAt: now,
  }
}

export function resolveOnboardingReset(now: number): OnboardingState {
  return createDefaultOnboardingState(now)
}

export function resolveOnboardingForWalletState(
  state: OnboardingState,
  walletState: WalletOnboardingState,
  now: number,
): OnboardingState {
  if (!walletState.hasMnemonic) {
    if (state.flow === 'create' && state.step === 'backup') {
      return {
        ...state,
        flow: null,
        step: 'welcome',
        status: 'in_progress',
        updatedAt: now,
      }
    }

    if (state.status === 'complete') {
      return resolveOnboardingInProgress(state, now)
    }

    return state
  }

  if (walletState.needsMnemonicBackup && state.flow === 'create') {
    return {
      ...state,
      status: 'in_progress',
      step: 'backup',
      updatedAt: now,
    }
  }

  if (state.flow === 'restore' && state.step === 'restore-federations') {
    return {
      ...state,
      status: 'in_progress',
      updatedAt: now,
    }
  }

  return resolveOnboardingComplete(state, now)
}

export const useOnboardingStore = defineStore('onboarding', {
  state: (): OnboardingState => readOnboardingState(),

  actions: {
    getState(): OnboardingState {
      return {
        version: ONBOARDING_STATE_VERSION,
        flow: this.flow,
        step: this.step,
        status: this.status,
        updatedAt: this.updatedAt,
      }
    },

    applyState(state: OnboardingState) {
      this.flow = state.flow
      this.step = state.step
      this.status = state.status
      this.updatedAt = state.updatedAt
      writeOnboardingState(state)
    },

    touch() {
      this.applyState(resolveOnboardingTouch(this.getState(), Date.now()))
    },

    start(flow: Exclude<OnboardingFlow, null>) {
      this.applyState(resolveOnboardingStart(this.getState(), flow, Date.now()))
    },

    goToStep(step: OnboardingStep) {
      this.applyState(resolveOnboardingStep(this.getState(), step, Date.now()))
    },

    markInProgress() {
      this.applyState(resolveOnboardingInProgress(this.getState(), Date.now()))
    },

    complete() {
      this.applyState(resolveOnboardingComplete(this.getState(), Date.now()))
    },

    reset() {
      this.applyState(resolveOnboardingReset(Date.now()))
    },

    normalizeForWalletState(walletState: WalletOnboardingState) {
      const currentState = this.getState()
      const nextState = resolveOnboardingForWalletState(currentState, walletState, Date.now())
      if (nextState === currentState) {
        return
      }
      this.applyState(nextState)
    },
  },
})
