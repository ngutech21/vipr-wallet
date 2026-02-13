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
  step: 'choice' as 'choice' | 'backup' | 'restore',
  isBackupPending: false,
  normalizeForMnemonicState: vi.fn(),
  startCreateFlow: vi.fn(),
  startRestoreFlow: vi.fn(),
  goToChoice: vi.fn(),
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

const QInputStub = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template:
    '<input v-bind="$attrs" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
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
        'q-input': QInputStub,
      },
    },
  })
}

describe('StartupWizardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    walletStoreMock.hasMnemonic = false
    walletStoreMock.needsMnemonicBackup = false
    walletStoreMock.loadMnemonic.mockResolvedValue(false)
    walletStoreMock.createMnemonic.mockResolvedValue()
    walletStoreMock.restoreMnemonic.mockResolvedValue()
    walletStoreMock.openWallet.mockResolvedValue()

    onboardingStoreMock.flow = null
    onboardingStoreMock.step = 'choice'
    onboardingStoreMock.isBackupPending = false
    onboardingStoreMock.startCreateFlow.mockImplementation(() => {
      onboardingStoreMock.flow = 'create'
      onboardingStoreMock.step = 'backup'
      onboardingStoreMock.isBackupPending = true
    })
    onboardingStoreMock.startRestoreFlow.mockImplementation(() => {
      onboardingStoreMock.flow = 'restore'
      onboardingStoreMock.step = 'restore'
      onboardingStoreMock.isBackupPending = false
    })
    onboardingStoreMock.goToChoice.mockImplementation(() => {
      onboardingStoreMock.flow = null
      onboardingStoreMock.step = 'choice'
      onboardingStoreMock.isBackupPending = false
    })
    onboardingStoreMock.complete.mockImplementation(() => {
      onboardingStoreMock.flow = null
      onboardingStoreMock.step = 'choice'
      onboardingStoreMock.isBackupPending = false
    })
  })

  it('create flow waits for backup confirmation before routing home', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.find('[data-testid="startup-wizard-create-btn"]').trigger('click')
    await flushPromises()

    expect(walletStoreMock.createMnemonic).toHaveBeenCalledTimes(1)
    expect(routerReplaceMock).not.toHaveBeenCalled()

    await wrapper.find('[data-testid="startup-wizard-backup-confirm-btn"]').trigger('click')
    await flushPromises()

    expect(walletStoreMock.markMnemonicBackupConfirmed).toHaveBeenCalledTimes(1)
    expect(routerReplaceMock).toHaveBeenCalledWith('/')
  })

  it('restore flow enforces all 12 words before submit', async () => {
    const wrapper = createWrapper()
    await flushPromises()

    await wrapper.find('[data-testid="startup-wizard-restore-btn"]').trigger('click')
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

    await wrapper.find('[data-testid="startup-wizard-restore-btn"]').trigger('click')

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

  it('resumes restore step after remount when progress says restore', async () => {
    onboardingStoreMock.flow = 'restore'
    onboardingStoreMock.step = 'restore'
    walletStoreMock.loadMnemonic.mockResolvedValue(false)

    const wrapper = createWrapper()
    await flushPromises()

    expect(onboardingStoreMock.startRestoreFlow).toHaveBeenCalledTimes(1)
    expect(onboardingStoreMock.goToChoice).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
