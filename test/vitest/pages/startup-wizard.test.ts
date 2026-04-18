import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import StartupWizardPage from 'src/pages/startup-wizard.vue'

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
}))

const onboardingStoreMock = vi.hoisted(() => ({
  flow: null as 'create' | 'restore' | null,
  step: 'choice' as 'install' | 'choice' | 'backup' | 'restore',
  status: 'complete' as 'in_progress' | 'complete',
  normalizeForWalletState: vi.fn(),
  start: vi.fn(),
  goToStep: vi.fn(),
  markInProgress: vi.fn(),
  complete: vi.fn(),
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
  props: ['label', 'disable', 'loading'],
  emits: ['click'],
  template:
    '<button v-bind="$attrs" :disabled="disable || loading" @click="$emit(\'click\')">{{ label }}</button>',
}

const QRadioStub = {
  props: ['modelValue', 'val', 'disable'],
  emits: ['update:modelValue'],
  template:
    '<input v-bind="$attrs" type="radio" :disabled="disable" :checked="modelValue === val" @change="$emit(\'update:modelValue\', val)" />',
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
        'q-stepper': SlotStub,
        'q-step': SlotStub,
        'q-btn': QBtnStub,
        'q-radio': QRadioStub,
        'q-input': QInputStub,
        'q-icon': QIconStub,
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

    onboardingStoreMock.flow = null
    onboardingStoreMock.step = 'choice'
    onboardingStoreMock.status = 'complete'
    onboardingStoreMock.start.mockImplementation((flow: 'create' | 'restore') => {
      onboardingStoreMock.flow = flow
      onboardingStoreMock.status = 'in_progress'
      onboardingStoreMock.step = flow === 'create' ? 'backup' : 'restore'
    })
    onboardingStoreMock.goToStep.mockImplementation(
      (step: 'install' | 'choice' | 'backup' | 'restore') => {
        onboardingStoreMock.step = step
      },
    )
    onboardingStoreMock.markInProgress.mockImplementation(() => {
      onboardingStoreMock.status = 'in_progress'
    })
    onboardingStoreMock.complete.mockImplementation(() => {
      onboardingStoreMock.flow = null
      onboardingStoreMock.step = 'choice'
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

  it('shows generic install guidance on desktop browsers', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-testid="startup-wizard-install-panel"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Install on your phone before setup')
    expect(wrapper.text()).toContain('On iPhone, open Vipr in Safari')
    expect(onboardingStoreMock.goToStep).toHaveBeenCalledWith('install')
  })

  it('hides install guidance when already running in standalone mode', async () => {
    setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    )
    setStandaloneState({ matches: true, standalone: true })

    const wrapper = createWrapper()
    await flushPromises()

    expect(wrapper.find('[data-testid="startup-wizard-install-panel"]').exists()).toBe(false)
  })

  it('create flow does not recreate mnemonic after going back to choice', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.find('[data-testid="startup-wizard-install-next-btn"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="startup-wizard-create-radio"]').trigger('change')
    await wrapper.find('[data-testid="startup-wizard-choice-next-btn"]').trigger('click')
    await flushPromises()
    expect(walletStoreMock.createMnemonic).toHaveBeenCalledTimes(1)

    await wrapper.find('[data-testid="startup-wizard-backup-back-btn"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="startup-wizard-choice-next-btn"]').trigger('click')
    await flushPromises()
    expect(walletStoreMock.createMnemonic).toHaveBeenCalledTimes(1)
  })

  it('restore flow enforces all 12 words before submit', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.find('[data-testid="startup-wizard-install-next-btn"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="startup-wizard-restore-radio"]').trigger('change')
    await wrapper.find('[data-testid="startup-wizard-choice-next-btn"]').trigger('click')
    await wrapper.find('[data-testid="startup-wizard-restore-submit-btn"]').trigger('click')

    expect(walletStoreMock.restoreMnemonic).not.toHaveBeenCalled()
    expect(notifyCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Please enter all 12 recovery words.',
      }),
    )
  })

  it('restore flow submits normalized 12-word mnemonic and routes home', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.find('[data-testid="startup-wizard-install-next-btn"]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid="startup-wizard-restore-radio"]').trigger('change')
    await wrapper.find('[data-testid="startup-wizard-choice-next-btn"]').trigger('click')

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
    expect(routerReplaceMock).toHaveBeenCalledWith('/')
  })

  it('resumes restore step after remount when persisted progress says restore', async () => {
    onboardingStoreMock.flow = 'restore'
    onboardingStoreMock.step = 'restore'
    onboardingStoreMock.status = 'in_progress'
    walletStoreMock.loadMnemonic.mockResolvedValue(false)

    const wrapper = createWrapper()
    await flushPromises()

    expect(onboardingStoreMock.goToStep).toHaveBeenCalledWith('restore')
    wrapper.unmount()
  })
})
