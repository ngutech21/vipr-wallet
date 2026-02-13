import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'

export type OnboardingFlow = 'create' | 'restore' | null
export type OnboardingStep = 'choice' | 'backup' | 'restore'

export const ONBOARDING_FLOW_KEY = 'vipr.onboarding.flow'
export const ONBOARDING_STEP_KEY = 'vipr.onboarding.step'

export const useOnboardingStore = defineStore('onboarding', {
  state: () => ({
    flow: useLocalStorage<OnboardingFlow>(ONBOARDING_FLOW_KEY, null),
    step: useLocalStorage<OnboardingStep>(ONBOARDING_STEP_KEY, 'choice'),
  }),

  getters: {
    isBackupPending: (state): boolean => state.flow === 'create' && state.step === 'backup',
  },

  actions: {
    startCreateFlow() {
      this.flow = 'create'
      this.step = 'backup'
    },

    startRestoreFlow() {
      this.flow = 'restore'
      this.step = 'restore'
    },

    goToChoice() {
      this.flow = null
      this.step = 'choice'
    },

    complete() {
      this.goToChoice()
    },

    normalizeForMnemonicState(hasMnemonic: boolean) {
      if (!hasMnemonic && this.step === 'backup') {
        this.goToChoice()
        return
      }

      if (hasMnemonic && !this.isBackupPending) {
        this.complete()
      }
    },
  },
})
