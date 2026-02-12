import { beforeEach, describe, expect, it, vi } from 'vitest'

const loadingMock = vi.hoisted(() => ({
  show: vi.fn(),
  hide: vi.fn(),
}))

const appStoreMock = vi.hoisted(() => ({
  setReady: vi.fn(),
}))

const walletStoreMock = vi.hoisted(() => ({
  ensureStorageSchema: vi.fn<() => Promise<boolean>>(),
  ensureMnemonicReady: vi.fn<() => Promise<boolean>>(),
  openWallet: vi.fn<() => Promise<void>>(),
}))

const federationStoreMock = vi.hoisted(() => ({
  selectedFederationId: null as string | null,
}))

const pwaUpdateStoreMock = vi.hoisted(() => ({
  checkForUpdatesStartup: vi.fn(),
}))

vi.mock('#q-app/wrappers', () => ({
  defineBoot: <T>(fn: T) => fn,
}))

vi.mock('quasar', () => ({
  Loading: {
    show: loadingMock.show,
    hide: loadingMock.hide,
  },
}))

vi.mock('src/stores/app', () => ({
  useAppStore: () => appStoreMock,
}))

vi.mock('src/stores/wallet', () => ({
  useWalletStore: () => walletStoreMock,
}))

vi.mock('src/stores/federation', () => ({
  useFederationStore: () => federationStoreMock,
}))

vi.mock('src/stores/pwa-update', () => ({
  usePwaUpdateStore: () => pwaUpdateStoreMock,
}))

vi.mock('src/services/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

import fedimintBoot from 'src/boot/fedimint'

describe('fedimint boot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    federationStoreMock.selectedFederationId = null
    walletStoreMock.ensureStorageSchema.mockResolvedValue(false)
    walletStoreMock.ensureMnemonicReady.mockResolvedValue(false)
    walletStoreMock.openWallet.mockResolvedValue()
    pwaUpdateStoreMock.checkForUpdatesStartup.mockResolvedValue(undefined)
  })

  it('redirects to backup words when mnemonic is newly generated', async () => {
    walletStoreMock.ensureMnemonicReady.mockResolvedValue(true)
    const router = {
      currentRoute: { value: { name: '/' } },
      replace: vi.fn(() => Promise.resolve()),
    }

    await fedimintBoot({ app: {}, router } as never)

    expect(walletStoreMock.ensureStorageSchema).toHaveBeenCalledTimes(1)
    expect(walletStoreMock.ensureMnemonicReady).toHaveBeenCalledTimes(1)
    expect(walletStoreMock.openWallet).toHaveBeenCalledTimes(1)
    expect(router.replace).toHaveBeenCalledWith({ name: '/settings/backup-words' })
    expect(pwaUpdateStoreMock.checkForUpdatesStartup).toHaveBeenCalledTimes(1)
  })

  it('does not redirect when mnemonic already exists', async () => {
    walletStoreMock.ensureMnemonicReady.mockResolvedValue(false)
    const router = {
      currentRoute: { value: { name: '/' } },
      replace: vi.fn(() => Promise.resolve()),
    }

    await fedimintBoot({ app: {}, router } as never)

    expect(router.replace).not.toHaveBeenCalled()
    expect(pwaUpdateStoreMock.checkForUpdatesStartup).toHaveBeenCalledTimes(1)
  })
})
