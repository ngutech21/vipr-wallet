import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import StartupWizardPage from 'src/pages/startup-wizard.vue'

type OnboardingStoreMock = {
  flow: 'create' | 'restore' | null
  step:
    | 'install'
    | 'welcome'
    | 'custody'
    | 'federation'
    | 'backup'
    | 'restore'
    | 'restore-federations'
    | 'done'
  status: 'in_progress' | 'complete'
  normalizeForWalletState: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
  goToStep: ReturnType<typeof vi.fn>
  markInProgress: ReturnType<typeof vi.fn>
  complete: ReturnType<typeof vi.fn>
}

const routerReplaceMock = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const notifyCreateMock = vi.hoisted(() => vi.fn())

const walletStoreMock = vi.hoisted(() => ({
  hasMnemonic: false,
  mnemonicWords: [
    'alpha',
    'bravo',
    'charlie',
    'delta',
    'echo',
    'foxtrot',
    'golf',
    'hotel',
    'india',
    'juliet',
    'kilo',
    'lima',
  ],
  needsMnemonicBackup: false,
  loadMnemonic: vi.fn<() => Promise<boolean>>(),
  createMnemonic: vi.fn<() => Promise<void>>(),
  restoreMnemonic: vi.fn<() => Promise<void>>(),
  markMnemonicBackupConfirmed: vi.fn(),
  openWallet: vi.fn<() => Promise<void>>(),
  updateBalance: vi.fn<() => Promise<void>>(),
  wallet: null as Record<string, never> | null,
  previewFederation: vi.fn(),
  markFederationRecoveryStatus: vi.fn(),
  recoveryInProgress: false,
  recoveryStatusByFederationId: {},
  recoveryFederationId: null as string | null,
  recoveryError: null as string | null,
}))

const onboardingStoreMock: OnboardingStoreMock = vi.hoisted(() => ({
  flow: null,
  step: 'welcome',
  status: 'complete',
  normalizeForWalletState: vi.fn(),
  start: vi.fn(),
  goToStep: vi.fn(),
  markInProgress: vi.fn(),
  complete: vi.fn(),
}))

const federationStoreMock = vi.hoisted(() => ({
  federations: [] as Array<{
    title: string
    inviteCode: string
    federationId: string
    modules: unknown[]
    metadata: Record<string, unknown>
  }>,
  addFederation: vi.fn(),
  selectFederation: vi.fn<() => Promise<void>>(),
  deleteFederation: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    replace: routerReplaceMock,
  }),
}))

vi.mock('src/stores/wallet', () => ({
  useWalletStore: () => walletStoreMock,
}))

vi.mock('src/stores/onboarding', () => ({
  useOnboardingStore: () => onboardingStoreMock,
}))

vi.mock('src/stores/federation', () => ({
  useFederationStore: () => federationStoreMock,
}))

vi.mock('quasar', async (importOriginal) => {
  const actual = await importOriginal()
  return Object.assign({}, actual, {
    Notify: {
      create: notifyCreateMock,
    },
  })
})

const SlotStub = {
  template: '<div><slot /></div>',
}

const QBtnStub = {
  props: ['label', 'disable', 'loading', 'to'],
  emits: ['click'],
  template:
    '<button v-bind="$attrs" :disabled="disable || loading" @click="$emit(\'click\')">{{ label }}<slot /></button>',
}

const QInputStub = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template:
    '<input v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
}

const QIconStub = {
  template: '<span><slot /></span>',
}

const JoinFederationInviteStepStub = {
  props: ['inviteCode'],
  emits: ['update:inviteCode', 'paste'],
  template:
    '<div data-testid="join-federation-invite-step"><input data-testid="invite-code-input" :value="inviteCode" @input="$emit(\'update:inviteCode\', $event.target.value)" /></div>',
}

const JoinFederationPreviewStepStub = {
  props: ['federation'],
  template: '<div data-testid="join-federation-preview-step">{{ federation.title }}</div>',
}

function setUserAgent(userAgent: string) {
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value: userAgent,
  })
}

function setStandaloneState({
  matches = false,
  standalone = false,
}: {
  matches?: boolean
  standalone?: boolean
} = {}) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  })

  Object.defineProperty(window.navigator, 'standalone', {
    configurable: true,
    value: standalone,
  })
}

function createWrapper() {
  return mount(StartupWizardPage, {
    global: {
      stubs: {
        transition: false,
        'q-page': SlotStub,
        'q-card': SlotStub,
        'q-card-section': SlotStub,
        'q-btn': QBtnStub,
        'q-input': QInputStub,
        'q-icon': QIconStub,
        'q-separator': true,
        JoinFederationInviteStep: JoinFederationInviteStepStub,
        JoinFederationPreviewStep: JoinFederationPreviewStepStub,
      },
    },
  })
}

describe('StartupWizardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')
    setStandaloneState()
    walletStoreMock.hasMnemonic = false
    walletStoreMock.needsMnemonicBackup = false
    walletStoreMock.loadMnemonic.mockResolvedValue(false)
    walletStoreMock.createMnemonic.mockImplementation(() => {
      walletStoreMock.hasMnemonic = true
      walletStoreMock.needsMnemonicBackup = true
      return Promise.resolve()
    })
    walletStoreMock.restoreMnemonic.mockResolvedValue()
    walletStoreMock.openWallet.mockResolvedValue()
    walletStoreMock.updateBalance.mockResolvedValue()
    walletStoreMock.wallet = null
    walletStoreMock.recoveryInProgress = false
    walletStoreMock.previewFederation.mockResolvedValue({
      title: 'Restored Federation',
      inviteCode: 'fed11restore',
      federationId: 'fed-restore',
      modules: [],
      metadata: {},
    })
    walletStoreMock.markFederationRecoveryStatus.mockImplementation((federationId, status) => {
      walletStoreMock.recoveryStatusByFederationId = {
        ...walletStoreMock.recoveryStatusByFederationId,
        [federationId]: status,
      }
    })
    walletStoreMock.recoveryStatusByFederationId = {}
    walletStoreMock.recoveryFederationId = null
    walletStoreMock.recoveryError = null
    federationStoreMock.federations = []
    federationStoreMock.addFederation.mockImplementation((federation) => {
      federationStoreMock.federations = [...federationStoreMock.federations, federation]
    })
    federationStoreMock.selectFederation.mockResolvedValue()
    federationStoreMock.deleteFederation.mockImplementation((federationId) => {
      federationStoreMock.federations = federationStoreMock.federations.filter(
        (federation) => federation.federationId !== federationId,
      )
    })

    onboardingStoreMock.flow = null
    onboardingStoreMock.step = 'welcome'
    onboardingStoreMock.status = 'complete'
    onboardingStoreMock.start.mockImplementation((flow: 'create' | 'restore') => {
      onboardingStoreMock.flow = flow
      onboardingStoreMock.status = 'in_progress'
      onboardingStoreMock.step = flow === 'create' ? 'welcome' : 'restore'
    })
    onboardingStoreMock.goToStep.mockImplementation((step: OnboardingStoreMock['step']) => {
      onboardingStoreMock.step = step
    })
    onboardingStoreMock.markInProgress.mockImplementation(() => {
      onboardingStoreMock.status = 'in_progress'
    })
    onboardingStoreMock.complete.mockImplementation(() => {
      onboardingStoreMock.flow = null
      onboardingStoreMock.step = 'welcome'
      onboardingStoreMock.status = 'complete'
    })
  })

  it('shows Android install guidance when onboarding in Chrome browser mode', async () => {
    setUserAgent(
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
    )

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-testid="startup-wizard-install-panel"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Add Vipr to your home screen')
    expect(wrapper.text()).toContain('Install from Chrome on Android')
    expect(onboardingStoreMock.goToStep).toHaveBeenCalledWith('install')
  })

  it('starts the create path and shows the custody screen', async () => {
    setStandaloneState({ matches: true, standalone: true })

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.find('[data-testid="startup-wizard-create-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="startup-wizard-custody-step"]').exists()).toBe(true)
    expect(onboardingStoreMock.start).toHaveBeenCalledWith('create')
    expect(onboardingStoreMock.goToStep).toHaveBeenCalledWith('custody')
  })

  it('skip creates the wallet once and moves straight to backup', async () => {
    setStandaloneState({ matches: true, standalone: true })

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.find('[data-testid="startup-wizard-create-btn"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-testid="startup-wizard-skip-btn"]').trigger('click')
    await flushPromises()

    expect(walletStoreMock.createMnemonic).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[data-testid="startup-wizard-backup-step"]').exists()).toBe(true)
  })

  it('restore flow enforces all 12 words before submit', async () => {
    setStandaloneState({ matches: true, standalone: true })

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.find('[data-testid="startup-wizard-restore-btn"]').trigger('click')
    await flushPromises()
    await wrapper.find('[data-testid="startup-wizard-restore-submit-btn"]').trigger('click')

    expect(walletStoreMock.restoreMnemonic).not.toHaveBeenCalled()
    expect(notifyCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Please enter all 12 recovery words.',
      }),
    )
  })

  it('restore flow submits normalized words and shows the federation restore step', async () => {
    setStandaloneState({ matches: true, standalone: true })

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.find('[data-testid="startup-wizard-restore-btn"]').trigger('click')
    await flushPromises()

    const words = [
      ' Alpha ',
      'BRAVO',
      'charlie',
      'delta',
      'echo',
      'foxtrot',
      'golf',
      'hotel',
      'india',
      'juliet',
      'kilo',
      'lima',
    ]

    await Promise.all(
      words.map(async (word, index) => {
        const input = wrapper.find(`[data-testid="startup-wizard-restore-word-${index + 1}"]`)
        await input.setValue(word)
      }),
    )

    await wrapper.find('[data-testid="startup-wizard-restore-submit-btn"]').trigger('click')
    await flushPromises()

    expect(walletStoreMock.restoreMnemonic).toHaveBeenCalledWith([
      'alpha',
      'bravo',
      'charlie',
      'delta',
      'echo',
      'foxtrot',
      'golf',
      'hotel',
      'india',
      'juliet',
      'kilo',
      'lima',
    ])
    expect(onboardingStoreMock.goToStep).toHaveBeenCalledWith('restore-federations')
    expect(wrapper.find('[data-testid="startup-wizard-restore-federations-step"]').exists()).toBe(
      true,
    )
    expect(wrapper.find('[data-testid="startup-wizard-done-step"]').exists()).toBe(false)
  })

  it('restore federation step previews a join code, saves federation, and keeps the step open', async () => {
    setStandaloneState({ matches: true, standalone: true })
    walletStoreMock.hasMnemonic = true
    onboardingStoreMock.flow = 'restore'
    onboardingStoreMock.step = 'restore-federations'
    onboardingStoreMock.status = 'in_progress'

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.find('[data-testid="invite-code-input"]').setValue(' fed11restore ')
    await wrapper
      .find('[data-testid="startup-wizard-restore-federations-preview-btn"]')
      .trigger('click')
    await flushPromises()

    expect(walletStoreMock.previewFederation).toHaveBeenCalledWith('fed11restore')
    expect(wrapper.find('[data-testid="join-federation-preview-step"]').text()).toContain(
      'Restored Federation',
    )

    await wrapper
      .find('[data-testid="startup-wizard-restore-federations-submit-btn"]')
      .trigger('click')
    await flushPromises()

    expect(federationStoreMock.addFederation).toHaveBeenCalledWith(
      expect.objectContaining({
        federationId: 'fed-restore',
      }),
    )
    expect(federationStoreMock.selectFederation).toHaveBeenCalledWith(
      expect.objectContaining({
        federationId: 'fed-restore',
      }),
      { expectRecovery: true, recoverOnJoin: true },
    )
    expect(wrapper.find('[data-testid="startup-wizard-restore-federations-step"]').exists()).toBe(
      true,
    )
    expect(
      wrapper.find('[data-testid="startup-wizard-restore-federation-status-fed-restore"]').text(),
    ).toContain('Recovering wallet history')
    const finishButton = wrapper.find(
      '[data-testid="startup-wizard-restore-federations-finish-btn"]',
    )
    expect(finishButton.attributes('disabled')).toBeDefined()
    expect(finishButton.text()).toContain('Recovering...')
  })

  it('restore federation step allows finish after recovery completes', async () => {
    setStandaloneState({ matches: true, standalone: true })
    walletStoreMock.hasMnemonic = true
    onboardingStoreMock.flow = 'restore'
    onboardingStoreMock.step = 'restore-federations'
    onboardingStoreMock.status = 'in_progress'
    federationStoreMock.selectFederation.mockImplementationOnce(() => {
      walletStoreMock.recoveryStatusByFederationId = {
        'fed-restore': 'restored',
      }
      return Promise.resolve()
    })

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.find('[data-testid="invite-code-input"]').setValue('fed11restore')
    await wrapper
      .find('[data-testid="startup-wizard-restore-federations-preview-btn"]')
      .trigger('click')
    await flushPromises()
    await wrapper
      .find('[data-testid="startup-wizard-restore-federations-submit-btn"]')
      .trigger('click')
    await flushPromises()

    const finishButton = wrapper.find(
      '[data-testid="startup-wizard-restore-federations-finish-btn"]',
    )
    expect(finishButton.attributes('disabled')).toBeUndefined()

    await finishButton.trigger('click')
    await flushPromises()

    expect(onboardingStoreMock.goToStep).toHaveBeenCalledWith('done')
  })

  it('done step enters the app', async () => {
    setStandaloneState({ matches: true, standalone: true })
    onboardingStoreMock.flow = 'create'
    onboardingStoreMock.step = 'done'
    onboardingStoreMock.status = 'in_progress'

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.find('[data-testid="startup-wizard-done-btn"]').trigger('click')
    await flushPromises()

    expect(routerReplaceMock).toHaveBeenCalledWith('/')
  })

  it('done step refreshes an already open wallet without reopening it', async () => {
    setStandaloneState({ matches: true, standalone: true })
    onboardingStoreMock.flow = 'create'
    onboardingStoreMock.step = 'done'
    onboardingStoreMock.status = 'in_progress'
    walletStoreMock.wallet = {}

    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.find('[data-testid="startup-wizard-done-btn"]').trigger('click')
    await flushPromises()

    expect(walletStoreMock.openWallet).not.toHaveBeenCalled()
    expect(walletStoreMock.updateBalance).toHaveBeenCalledTimes(1)
    expect(routerReplaceMock).toHaveBeenCalledWith('/')
  })
})
