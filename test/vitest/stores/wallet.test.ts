import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Federation } from 'src/components/models'

const fedimintClientMock = vi.hoisted(() => ({
  init: vi.fn<() => Promise<void>>(),
  setLogLevel: vi.fn(),
  ensureWalletOpen: vi.fn(),
  ensureMnemonic: vi.fn<() => Promise<{ words: string[]; created: boolean }>>(),
  closeActiveWallet: vi.fn<() => Promise<void>>(),
  deleteWallet: vi.fn<() => Promise<void>>(),
  clearAllWallets: vi.fn<() => Promise<void>>(),
  listWallets: vi.fn<() => Promise<string[]>>(),
  previewFederation: vi.fn(),
  reset: vi.fn(),
}))

vi.mock('src/services/fedimint-client', () => ({
  fedimintClient: fedimintClientMock,
}))

import {
  FEDIMINT_MNEMONIC_BACKUP_CONFIRMED_KEY,
  FEDIMINT_STORAGE_SCHEMA_KEY,
  FEDIMINT_STORAGE_SCHEMA_VERSION,
  getWalletNameForFederationId,
  useWalletStore,
} from 'src/stores/wallet'
import { useFederationStore } from 'src/stores/federation'

function createFederation(overrides: Partial<Federation> = {}): Federation {
  return {
    title: 'Test Federation',
    inviteCode: 'fed11testinvite',
    federationId: 'fed-1',
    modules: [],
    metadata: {},
    ...overrides,
  }
}

function createWalletMock(balanceMsats: number) {
  return {
    isOpen: vi.fn(() => true),
    open: vi.fn(),
    joinFederation: vi.fn(),
    cleanup: vi.fn(),
    federation: {
      getFederationId: vi.fn(() => Promise.resolve('fed-1')),
      listTransactions: vi.fn(),
    },
    mint: {
      parseNotes: vi.fn(),
      reissueExternalNotes: vi.fn(),
      subscribeReissueExternalNotes: vi.fn(),
    },
    lightning: {},
    balance: {
      getBalance: vi.fn(() => Promise.resolve(balanceMsats)),
    },
  }
}

describe('wallet store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()

    fedimintClientMock.init.mockResolvedValue()
    fedimintClientMock.closeActiveWallet.mockResolvedValue()
    fedimintClientMock.deleteWallet.mockResolvedValue()
    fedimintClientMock.clearAllWallets.mockResolvedValue()
    fedimintClientMock.listWallets.mockResolvedValue([])
    fedimintClientMock.ensureMnemonic.mockResolvedValue({
      words: ['abandon', 'ability', 'able', 'about'],
      created: false,
    })
  })

  it('opens the selected federation wallet via deterministic wallet name', async () => {
    const walletStore = useWalletStore()
    const federationStore = useFederationStore()
    const federation = createFederation()

    federationStore.federations = [federation]
    federationStore.selectedFederationId = federation.federationId

    const wallet = createWalletMock(12_000)
    fedimintClientMock.ensureWalletOpen.mockResolvedValue(wallet)

    await walletStore.openWallet()

    expect(fedimintClientMock.ensureMnemonic).toHaveBeenCalledTimes(1)
    expect(fedimintClientMock.ensureWalletOpen).toHaveBeenCalledWith({
      walletName: getWalletNameForFederationId(federation.federationId),
      federationId: federation.federationId,
      inviteCode: federation.inviteCode,
    })
    expect(walletStore.activeWalletName).toBe(getWalletNameForFederationId(federation.federationId))
    expect(walletStore.balance).toBe(12)
  })

  it('deletes federation data via wallet manager wallet name', async () => {
    const walletStore = useWalletStore()

    await walletStore.deleteFederationData('fed-delete')

    expect(fedimintClientMock.deleteWallet).toHaveBeenCalledWith('wallet-fed-delete')
  })

  it('applies silent storage schema migration exactly once', async () => {
    const walletStore = useWalletStore()
    const federationStore = useFederationStore()

    federationStore.federations = [createFederation()]
    federationStore.selectedFederationId = 'fed-1'

    const migrated = await walletStore.ensureStorageSchema()

    expect(migrated).toBe(true)
    expect(fedimintClientMock.clearAllWallets).toHaveBeenCalledTimes(1)
    expect(federationStore.federations).toEqual([])
    expect(federationStore.selectedFederationId).toBeNull()
    expect(localStorage.getItem(FEDIMINT_STORAGE_SCHEMA_KEY)).toBe(FEDIMINT_STORAGE_SCHEMA_VERSION)
    expect(localStorage.getItem(FEDIMINT_MNEMONIC_BACKUP_CONFIRMED_KEY)).toBe('0')

    const migratedAgain = await walletStore.ensureStorageSchema()

    expect(migratedAgain).toBe(false)
    expect(fedimintClientMock.clearAllWallets).toHaveBeenCalledTimes(1)
  })

  it('tracks mnemonic readiness and backup confirmation flag', async () => {
    const walletStore = useWalletStore()
    fedimintClientMock.ensureMnemonic.mockResolvedValue({
      words: ['alpha', 'beta', 'gamma'],
      created: true,
    })

    await walletStore.ensureMnemonicReady()

    expect(walletStore.mnemonicWords).toEqual(['alpha', 'beta', 'gamma'])
    expect(walletStore.needsMnemonicBackup).toBe(true)
    expect(localStorage.getItem(FEDIMINT_MNEMONIC_BACKUP_CONFIRMED_KEY)).toBe('0')

    walletStore.markMnemonicBackupConfirmed()
    expect(walletStore.needsMnemonicBackup).toBe(false)
    expect(localStorage.getItem(FEDIMINT_MNEMONIC_BACKUP_CONFIRMED_KEY)).toBe('1')
  })

  it('keeps backup confirmed state when mnemonic already existed', async () => {
    const walletStore = useWalletStore()
    localStorage.setItem(FEDIMINT_MNEMONIC_BACKUP_CONFIRMED_KEY, '1')
    fedimintClientMock.ensureMnemonic.mockResolvedValue({
      words: ['existing', 'seed'],
      created: false,
    })

    const created = await walletStore.ensureMnemonicReady()

    expect(created).toBe(false)
    expect(walletStore.mnemonicWords).toEqual(['existing', 'seed'])
    expect(walletStore.needsMnemonicBackup).toBe(false)
    expect(localStorage.getItem(FEDIMINT_MNEMONIC_BACKUP_CONFIRMED_KEY)).toBe('1')
  })
})
