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
    onboardingStoreMock.goToStep.mockImplementation((step: 'choice' | 'backup' | 'restore') => {
      onboardingStoreMock.step = step
    })
    onboardingStoreMock.markInProgress.mockImplementation(() => {
      onboardingStoreMock.status = 'in_progress'
    })
    onboardingStoreMock.complete.mockImplementation(() => {
      onboardingStoreMock.flow = null
      onboardingStoreMock.step = 'choice'
      onboardingStoreMock.status = 'complete'
    })
  })

  it('create flow does not recreate mnemonic after going back to choice', async () => {
    const wrapper = createWrapper()
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
