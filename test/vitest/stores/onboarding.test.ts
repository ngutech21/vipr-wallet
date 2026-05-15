import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  LEGACY_ONBOARDING_FLOW_KEY,
  LEGACY_ONBOARDING_STEP_KEY,
  ONBOARDING_STATE_KEY,
  resolveOnboardingForWalletState,
  resolveOnboardingStart,
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
    expect(onboardingStore.step).toBe('welcome')
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
    expect(onboardingStore.step).toBe('welcome')
    expect(onboardingStore.status).toBe('complete')
  })

  it('cold resets legacy keys and does not migrate old flow/step', () => {
    localStorage.setItem(LEGACY_ONBOARDING_FLOW_KEY, 'create')
    localStorage.setItem(LEGACY_ONBOARDING_STEP_KEY, 'backup')

    const onboardingStore = useOnboardingStore()

    expect(onboardingStore.flow).toBeNull()
    expect(onboardingStore.step).toBe('welcome')
    expect(localStorage.getItem(LEGACY_ONBOARDING_FLOW_KEY)).toBeNull()
    expect(localStorage.getItem(LEGACY_ONBOARDING_STEP_KEY)).toBeNull()
  })

  it('keeps restore federation step in progress after mnemonic restore', () => {
    const onboardingStore = useOnboardingStore()
    onboardingStore.start('restore')
    onboardingStore.goToStep('restore-federations')

    onboardingStore.normalizeForWalletState({
      hasMnemonic: true,
      needsMnemonicBackup: false,
    })

    expect(onboardingStore.flow).toBe('restore')
    expect(onboardingStore.step).toBe('restore-federations')
    expect(onboardingStore.status).toBe('in_progress')
  })
})

describe('onboarding state transitions', () => {
  it('starts create and restore flows with deterministic timestamps', () => {
    expect(resolveOnboardingStart(createState({ flow: null }), 'create', 50)).toEqual(
      createState({
        flow: 'create',
        step: 'welcome',
        status: 'in_progress',
        updatedAt: 50,
      }),
    )

    expect(resolveOnboardingStart(createState({ flow: null }), 'restore', 60)).toEqual(
      createState({
        flow: 'restore',
        step: 'restore',
        status: 'in_progress',
        updatedAt: 60,
      }),
    )
  })

  it('moves an incomplete create backup flow back to welcome when mnemonic disappears', () => {
    expect(
      resolveOnboardingForWalletState(
        createState({
          flow: 'create',
          step: 'backup',
          status: 'in_progress',
          updatedAt: 10,
        }),
        {
          hasMnemonic: false,
          needsMnemonicBackup: false,
        },
        20,
      ),
    ).toEqual(
      createState({
        flow: null,
        step: 'welcome',
        status: 'in_progress',
        updatedAt: 20,
      }),
    )
  })

  it('reopens completed onboarding when no mnemonic exists', () => {
    expect(
      resolveOnboardingForWalletState(
        createState({
          flow: null,
          step: 'welcome',
          status: 'complete',
          updatedAt: 10,
        }),
        {
          hasMnemonic: false,
          needsMnemonicBackup: false,
        },
        20,
      ),
    ).toEqual(
      createState({
        flow: null,
        step: 'welcome',
        status: 'in_progress',
        updatedAt: 20,
      }),
    )
  })

  it('keeps in-progress onboarding unchanged when no mnemonic exists outside backup recovery', () => {
    const state = createState({
      flow: 'restore',
      step: 'restore',
      status: 'in_progress',
      updatedAt: 10,
    })

    expect(
      resolveOnboardingForWalletState(
        state,
        {
          hasMnemonic: false,
          needsMnemonicBackup: false,
        },
        20,
      ),
    ).toBe(state)
  })

  it('requires backup for create flows with an unconfirmed mnemonic backup', () => {
    expect(
      resolveOnboardingForWalletState(
        createState({
          flow: 'create',
          step: 'federation',
          status: 'complete',
          updatedAt: 10,
        }),
        {
          hasMnemonic: true,
          needsMnemonicBackup: true,
        },
        20,
      ),
    ).toEqual(
      createState({
        flow: 'create',
        step: 'backup',
        status: 'in_progress',
        updatedAt: 20,
      }),
    )
  })

  it('keeps restore federation recovery in progress after mnemonic restore', () => {
    expect(
      resolveOnboardingForWalletState(
        createState({
          flow: 'restore',
          step: 'restore-federations',
          status: 'complete',
          updatedAt: 10,
        }),
        {
          hasMnemonic: true,
          needsMnemonicBackup: false,
        },
        20,
      ),
    ).toEqual(
      createState({
        flow: 'restore',
        step: 'restore-federations',
        status: 'in_progress',
        updatedAt: 20,
      }),
    )
  })

  it('completes onboarding when wallet state has no remaining recovery or backup requirements', () => {
    expect(
      resolveOnboardingForWalletState(
        createState({
          flow: 'restore',
          step: 'restore',
          status: 'in_progress',
          updatedAt: 10,
        }),
        {
          hasMnemonic: true,
          needsMnemonicBackup: false,
        },
        20,
      ),
    ).toEqual(
      createState({
        flow: null,
        step: 'welcome',
        status: 'complete',
        updatedAt: 20,
      }),
    )
  })
})
