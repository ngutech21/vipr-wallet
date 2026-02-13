import { beforeEach, describe, expect, it, vi } from 'vitest'

const loadingMock = vi.hoisted(() => ({
  show: vi.fn(),
  hide: vi.fn(),
}))

const appStoreMock = vi.hoisted(() => ({
  setReady: vi.fn(),
}))

const walletStoreMock = vi.hoisted(() => ({
  hasMnemonic: false,
  needsMnemonicBackup: false,
  ensureStorageSchema: vi.fn<() => Promise<boolean>>(),
  loadMnemonic: vi.fn<() => Promise<boolean>>(),
  openWallet: vi.fn<() => Promise<void>>(),
}))

const onboardingStoreMock = vi.hoisted(() => ({
  status: 'complete' as 'in_progress' | 'complete',
  flow: null as 'create' | 'restore' | null,
  normalizeForWalletState: vi.fn(),
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

vi.mock('src/stores/onboarding', () => ({
  useOnboardingStore: () => onboardingStoreMock,
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
    walletStoreMock.hasMnemonic = false
    walletStoreMock.needsMnemonicBackup = false
    walletStoreMock.ensureStorageSchema.mockResolvedValue(false)
    walletStoreMock.loadMnemonic.mockImplementation(() =>
      Promise.resolve(walletStoreMock.hasMnemonic),
    )
    onboardingStoreMock.status = 'complete'
    onboardingStoreMock.flow = null
    walletStoreMock.openWallet.mockResolvedValue()
    pwaUpdateStoreMock.checkForUpdatesStartup.mockResolvedValue(undefined)
  })

  it('redirects to startup wizard when mnemonic is missing', async () => {
    walletStoreMock.hasMnemonic = false
    const router = {
      currentRoute: { value: { name: '/', path: '/' } },
      replace: vi.fn(() => Promise.resolve()),
      beforeEach: vi.fn(),
    }

    await fedimintBoot({ app: {}, router } as never)

    expect(walletStoreMock.ensureStorageSchema).toHaveBeenCalledTimes(1)
    expect(walletStoreMock.loadMnemonic).toHaveBeenCalledTimes(1)
    expect(walletStoreMock.openWallet).not.toHaveBeenCalled()
    expect(router.replace).toHaveBeenCalledWith('/startup-wizard')
    expect(pwaUpdateStoreMock.checkForUpdatesStartup).toHaveBeenCalledTimes(1)
  })

  it('opens wallet and does not redirect when mnemonic exists', async () => {
    walletStoreMock.hasMnemonic = true
    const router = {
      currentRoute: { value: { name: '/', path: '/' } },
      replace: vi.fn(() => Promise.resolve()),
      beforeEach: vi.fn(),
    }

    await fedimintBoot({ app: {}, router } as never)

    expect(walletStoreMock.openWallet).toHaveBeenCalledTimes(1)
    expect(router.replace).not.toHaveBeenCalled()
    expect(pwaUpdateStoreMock.checkForUpdatesStartup).toHaveBeenCalledTimes(1)
  })

  it('redirects to startup wizard when create flow is still in progress and backup is needed', async () => {
    walletStoreMock.hasMnemonic = true
    walletStoreMock.needsMnemonicBackup = true
    onboardingStoreMock.status = 'in_progress'
    onboardingStoreMock.flow = 'create'

    const router = {
      currentRoute: { value: { name: '/', path: '/' } },
      replace: vi.fn(() => Promise.resolve()),
      beforeEach: vi.fn(),
    }

    await fedimintBoot({ app: {}, router } as never)

    expect(walletStoreMock.openWallet).not.toHaveBeenCalled()
    expect(router.replace).toHaveBeenCalledWith('/startup-wizard')
  })
})
