import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import BackupWordsPage from 'src/pages/settings/backup-words.vue'
import { PassthroughStub, QBtnStub, QPageStub } from '../mocks/quasar-stubs'

const mockRouterPush = vi.hoisted(() => vi.fn())
const mockNotify = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}))
const walletStore = vi.hoisted(() => ({
  mnemonicWords: [] as string[],
  loadMnemonic: vi.fn(),
  markMnemonicBackupConfirmed: vi.fn(),
}))
const federationStore = vi.hoisted(() => ({
  federations: [] as Array<{
    federationId: string
    title: string
    inviteCode: string
    modules: unknown[]
  }>,
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}))

vi.mock('src/stores/wallet', () => ({
  useWalletStore: () => walletStore,
}))

vi.mock('src/stores/federation', () => ({
  useFederationStore: () => federationStore,
}))

vi.mock('src/composables/useAppNotify', () => ({
  useAppNotify: () => mockNotify,
}))

function createMnemonicWords() {
  return Array.from({ length: 12 }, (_, index) => `word${index + 1}`)
}

function mountPage() {
  return mount(BackupWordsPage, {
    global: {
      stubs: {
        ViprTopbar: {
          emits: ['back'],
          template:
            '<button data-testid="backup-words-back-stub" @click="$emit(\'back\')">back</button>',
        },
        'q-page': QPageStub,
        'q-card': PassthroughStub,
        'q-card-section': PassthroughStub,
        'q-btn': QBtnStub,
      },
    },
  })
}

describe('BackupWordsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    walletStore.mnemonicWords = createMnemonicWords()
    walletStore.loadMnemonic.mockResolvedValue(true)
    federationStore.federations = []
    vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
  })

  it('loads and renders the wallet recovery words in order', async () => {
    const wrapper = mountPage()
    await flushPromises()

    expect(walletStore.loadMnemonic).toHaveBeenCalledTimes(1)
    expect(wrapper.findAll('[data-testid^="backup-word-card-"]')).toHaveLength(12)
    expect(wrapper.get('[data-testid="backup-word-1"]').text()).toBe('word1')
    expect(wrapper.get('[data-testid="backup-word-12"]').text()).toBe('word12')
  })

  it('notifies when no mnemonic can be loaded', async () => {
    walletStore.mnemonicWords = []
    walletStore.loadMnemonic.mockResolvedValue(false)

    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.findAll('[data-testid^="backup-word-card-"]')).toHaveLength(0)
    expect(mockNotify.error).toHaveBeenCalledWith(
      'Failed to load recovery phrase: No wallet mnemonic found',
    )
  })

  it('copies trimmed federation join codes as a restore backup', async () => {
    const writeTextMock = vi.fn<(data: string) => Promise<void>>().mockResolvedValue(undefined)
    vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeTextMock)
    federationStore.federations = [
      { federationId: 'fed-1', title: 'Fed One', inviteCode: ' fed11one ', modules: [] },
      { federationId: 'fed-empty', title: 'Empty', inviteCode: '   ', modules: [] },
      { federationId: 'fed-2', title: 'Fed Two', inviteCode: 'fed12two', modules: [] },
    ]

    const wrapper = mountPage()
    await flushPromises()

    expect(wrapper.find('[data-testid="backup-federations-empty"]').exists()).toBe(false)
    await wrapper.get('[data-testid="backup-federations-copy-all-btn"]').trigger('click')

    expect(writeTextMock).toHaveBeenCalledWith('Fed One\nfed11one\n\nFed Two\nfed12two')
    expect(mockNotify.success).toHaveBeenCalledWith('Federation join codes copied', {
      timeout: 1000,
    })
  })

  it('copies a single federation join code and reports clipboard failures', async () => {
    federationStore.federations = [
      { federationId: 'fed-1', title: 'Fed One', inviteCode: 'fed11one', modules: [] },
    ]
    const writeTextMock = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockRejectedValueOnce(new Error('permission denied'))
      .mockResolvedValueOnce(undefined)

    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('[data-testid="backup-federation-copy-fed-1"]').trigger('click')
    expect(mockNotify.error).toHaveBeenCalledWith(
      'Failed to copy federation join code: permission denied',
    )

    await wrapper.get('[data-testid="backup-federation-copy-fed-1"]').trigger('click')
    expect(writeTextMock).toHaveBeenLastCalledWith('fed11one')
    expect(mockNotify.success).toHaveBeenCalledWith('Federation join code copied', {
      timeout: 1000,
    })
  })

  it('marks the backup as confirmed before returning to settings', async () => {
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.get('[data-testid="backup-words-confirm-btn"]').trigger('click')

    expect(walletStore.markMnemonicBackupConfirmed).toHaveBeenCalledTimes(1)
    expect(mockRouterPush).toHaveBeenCalledWith({ name: '/settings/' })
  })
})
