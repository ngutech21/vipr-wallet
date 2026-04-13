import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Federation } from 'src/components/models'

const fedimintClientMock = vi.hoisted(() => ({
  init: vi.fn<() => Promise<void>>(),
  setLogLevel: vi.fn(),
  ensureWalletOpen: vi.fn(),
  getMnemonicIfSet: vi.fn<() => Promise<string[] | null>>(),
  generateMnemonic: vi.fn<() => Promise<string[]>>(),
  setMnemonic: vi.fn<() => Promise<void>>(),
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
  mapTxOutputSummaryToFederationUtxo,
  parseOutpoint,
  useWalletStore,
} from 'src/stores/wallet'
import { useFederationStore } from 'src/stores/federation'
import type { TxOutputSummary } from '@fedimint/core'

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
      spendNotes: vi.fn(),
      subscribeSpendNotes: vi.fn(),
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
    fedimintClientMock.getMnemonicIfSet.mockResolvedValue([
      'abandon',
      'ability',
      'able',
      'about',
      'above',
      'absent',
      'absorb',
      'abstract',
      'absurd',
      'abuse',
      'access',
      'accident',
    ])
    fedimintClientMock.generateMnemonic.mockResolvedValue([
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
    fedimintClientMock.setMnemonic.mockResolvedValue()
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

    expect(fedimintClientMock.getMnemonicIfSet).toHaveBeenCalledTimes(1)
    expect(fedimintClientMock.ensureWalletOpen).toHaveBeenCalledWith({
      walletName: getWalletNameForFederationId(federation.federationId),
      federationId: federation.federationId,
      inviteCode: federation.inviteCode,
    })
    expect(walletStore.activeWalletName).toBe(getWalletNameForFederationId(federation.federationId))
    expect(walletStore.balance).toBe(12)
  })

  it('throws when opening a federation wallet without mnemonic', async () => {
    const walletStore = useWalletStore()
    const federationStore = useFederationStore()
    const federation = createFederation()

    federationStore.federations = [federation]
    federationStore.selectedFederationId = federation.federationId
    fedimintClientMock.getMnemonicIfSet.mockResolvedValue(null)

    await expect(walletStore.openWallet()).rejects.toThrow('Wallet mnemonic is not initialized')
    expect(fedimintClientMock.ensureWalletOpen).not.toHaveBeenCalled()
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

  it('createMnemonic sets words and backup-required flag', async () => {
    const walletStore = useWalletStore()

    await walletStore.createMnemonic()

    expect(walletStore.hasMnemonic).toBe(true)
    expect(walletStore.mnemonicWords).toHaveLength(12)
    expect(walletStore.needsMnemonicBackup).toBe(true)
    expect(localStorage.getItem(FEDIMINT_MNEMONIC_BACKUP_CONFIRMED_KEY)).toBe('0')
  })

  it('restoreMnemonic uses setMnemonic and marks backup as confirmed', async () => {
    const walletStore = useWalletStore()

    await walletStore.restoreMnemonic([
      'abandon',
      'ability',
      'able',
      'about',
      'above',
      'absent',
      'absorb',
      'abstract',
      'absurd',
      'abuse',
      'access',
      'accident',
    ])

    expect(fedimintClientMock.setMnemonic).toHaveBeenCalledTimes(1)
    expect(walletStore.hasMnemonic).toBe(true)
    expect(walletStore.needsMnemonicBackup).toBe(false)
    expect(localStorage.getItem(FEDIMINT_MNEMONIC_BACKUP_CONFIRMED_KEY)).toBe('1')
  })

  it('loadMnemonic returns false when no mnemonic is set', async () => {
    const walletStore = useWalletStore()
    fedimintClientMock.getMnemonicIfSet.mockResolvedValue(null)

    const hasMnemonic = await walletStore.loadMnemonic()

    expect(hasMnemonic).toBe(false)
    expect(walletStore.hasMnemonic).toBe(false)
    expect(walletStore.mnemonicWords).toEqual([])
    expect(walletStore.needsMnemonicBackup).toBe(false)
  })

  it('loadMnemonic respects backup confirmation flag for existing mnemonic', async () => {
    const walletStore = useWalletStore()
    localStorage.setItem(FEDIMINT_MNEMONIC_BACKUP_CONFIRMED_KEY, '1')

    const hasMnemonic = await walletStore.loadMnemonic()

    expect(hasMnemonic).toBe(true)
    expect(walletStore.hasMnemonic).toBe(true)
    expect(walletStore.needsMnemonicBackup).toBe(false)
  })

  it('spendEcashOffline creates notes, converts sats to msats, and refreshes balance', async () => {
    const walletStore = useWalletStore()
    const wallet = createWalletMock(21_000)
    wallet.balance.getBalance = vi.fn().mockResolvedValueOnce(8_000).mockResolvedValueOnce(8_000)
    wallet.mint.spendNotes.mockResolvedValue({
      notes: 'cashuA123',
      operation_id: 'op-offline-1',
    })
    wallet.mint.subscribeSpendNotes.mockImplementation((_operationId, onSuccess) => {
      onSuccess('Success')
      return vi.fn()
    })

    walletStore.wallet = wallet as never

    const result = await walletStore.spendEcashOffline(13)

    expect(wallet.mint.spendNotes).toHaveBeenCalledWith(13_000, 86_400, false)
    expect(wallet.mint.subscribeSpendNotes).toHaveBeenCalledWith(
      'op-offline-1',
      expect.any(Function),
      expect.any(Function),
    )
    expect(result).toEqual({
      notes: 'cashuA123',
      operationId: 'op-offline-1',
    })
    expect(walletStore.balance).toBe(8)
  })

  it('spendEcashOffline still returns notes when the immediate balance refresh fails', async () => {
    const walletStore = useWalletStore()
    const wallet = createWalletMock(21_000)
    wallet.balance.getBalance = vi
      .fn()
      .mockRejectedValueOnce(new Error('balance refresh failed'))
      .mockResolvedValueOnce(8_000)
    wallet.mint.spendNotes.mockResolvedValue({
      notes: 'cashuA123',
      operation_id: 'op-offline-1',
    })
    wallet.mint.subscribeSpendNotes.mockImplementation((_operationId, onSuccess) => {
      onSuccess('Success')
      return vi.fn()
    })

    walletStore.wallet = wallet as never

    const result = await walletStore.spendEcashOffline(13)

    expect(result).toEqual({
      notes: 'cashuA123',
      operationId: 'op-offline-1',
    })
    expect(wallet.mint.subscribeSpendNotes).toHaveBeenCalledWith(
      'op-offline-1',
      expect.any(Function),
      expect.any(Function),
    )
    await Promise.resolve()
    await Promise.resolve()
    expect(walletStore.balance).toBe(8)
  })

  it('spendEcashOffline rejects invalid amounts before touching the wallet', async () => {
    const walletStore = useWalletStore()
    const wallet = createWalletMock(21_000)
    walletStore.wallet = wallet as never

    await expect(walletStore.spendEcashOffline(0)).rejects.toThrow(
      'Amount must be a positive whole number of sats',
    )
    expect(wallet.mint.spendNotes).not.toHaveBeenCalled()
  })
})

describe('wallet utxo helpers', () => {
  it('parses string outpoints in txid:vout format', () => {
    expect(
      parseOutpoint('F6F735A7B8642104B399196FB85B724CD7E8C36C55BBF962FBA063E798F4A486:1'),
    ).toEqual({
      txid: 'f6f735a7b8642104b399196fb85b724cd7e8c36c55bbf962fba063e798f4a486',
      vout: 1,
    })
  })

  it('falls back to vout 0 when string outpoint has no numeric index', () => {
    expect(parseOutpoint('abc:not-a-number')).toEqual({
      txid: 'abc',
      vout: 0,
    })
  })

  it('parses object outpoints', () => {
    expect(
      parseOutpoint({
        txid: ' A8C08C36F7F2CB6A51EC2DE382CBD53F28AAE21860A24139721F5815AC4CF759 ',
        vout: 3,
      }),
    ).toEqual({
      txid: 'a8c08c36f7f2cb6a51ec2de382cbd53f28aae21860a24139721f5815ac4cf759',
      vout: 3,
    })
  })

  it('maps tx output summaries with string outpoints to federation utxos', () => {
    const output = {
      outpoint: 'c7361f4cd75cbf199d151150a4613c2ede9f78b86c101b06fe38d54d9f6a9844:1',
      amount: 1_398_888,
    } as unknown as TxOutputSummary

    expect(mapTxOutputSummaryToFederationUtxo(output)).toEqual({
      txid: 'c7361f4cd75cbf199d151150a4613c2ede9f78b86c101b06fe38d54d9f6a9844',
      vout: 1,
      amount: 1_398_888,
    })
  })
})
