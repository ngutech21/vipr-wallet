import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  LEGACY_ONBOARDING_FLOW_KEY,
  LEGACY_ONBOARDING_STEP_KEY,
  ONBOARDING_STATE_KEY,
  type OnboardingState,
  useOnboardingStore,
} from 'src/stores/onboarding'

function createState(overrides: Partial<OnboardingState> = {}): OnboardingState {
  return {
    version: 1,
    flow: 'create',
    step: 'backup',
    status: 'in_progress',
    updatedAt: 12345,
    ...overrides,
  }
}

describe('onboarding store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('loads valid versioned onboarding state', () => {
    localStorage.setItem(ONBOARDING_STATE_KEY, JSON.stringify(createState()))

    const onboardingStore = useOnboardingStore()

    expect(onboardingStore.flow).toBe('create')
    expect(onboardingStore.step).toBe('backup')
    expect(onboardingStore.status).toBe('in_progress')
  })

  it('resets to default when state is malformed', () => {
    localStorage.setItem(ONBOARDING_STATE_KEY, '{invalid-json')

    const onboardingStore = useOnboardingStore()

    expect(onboardingStore.flow).toBeNull()
    expect(onboardingStore.step).toBe('choice')
    expect(onboardingStore.status).toBe('complete')
  })

  it('resets to default when version is unknown', () => {
    localStorage.setItem(
      ONBOARDING_STATE_KEY,
      JSON.stringify({
        version: 999,
        flow: 'create',
        step: 'backup',
        status: 'in_progress',
        updatedAt: 1,
      }),
    )

    const onboardingStore = useOnboardingStore()

    expect(onboardingStore.flow).toBeNull()
    expect(onboardingStore.step).toBe('choice')
    expect(onboardingStore.status).toBe('complete')
  })

  it('cold resets legacy keys and does not migrate old flow/step', () => {
    localStorage.setItem(LEGACY_ONBOARDING_FLOW_KEY, 'create')
    localStorage.setItem(LEGACY_ONBOARDING_STEP_KEY, 'backup')

    const onboardingStore = useOnboardingStore()

    expect(onboardingStore.flow).toBeNull()
    expect(onboardingStore.step).toBe('choice')
    expect(localStorage.getItem(LEGACY_ONBOARDING_FLOW_KEY)).toBeNull()
    expect(localStorage.getItem(LEGACY_ONBOARDING_STEP_KEY)).toBeNull()
  })
})
