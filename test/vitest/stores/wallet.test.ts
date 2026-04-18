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
      listOperations: vi.fn(),
    },
    mint: {
      parseNotes: vi.fn(() => Promise.resolve(12_000)),
      reissueExternalNotes: vi.fn(() => Promise.resolve('op-1')),
      subscribeReissueExternalNotes: vi.fn(),
      spendNotes: vi.fn(),
      subscribeSpendNotes: vi.fn(),
    },
    lightning: {},
    balance: {
      getBalance: vi.fn(() => Promise.resolve(balanceMsats)),
    },
    recovery: {
      hasPendingRecoveries: vi.fn(() => Promise.resolve(false)),
      waitForAllRecoveries: vi.fn(() => Promise.resolve()),
      subscribeToRecoveryProgress: vi.fn(() => vi.fn()),
    },
    wallet: {
      getWalletSummary: vi.fn(),
      sendOnchain: vi.fn(),
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
      forceRecover: false,
    })
    expect(walletStore.activeWalletName).toBe(getWalletNameForFederationId(federation.federationId))
    expect(walletStore.balance).toBe(12)
  })

  it('refreshes balance and transactions after wallet recovery completes', async () => {
    const walletStore = useWalletStore()
    const federationStore = useFederationStore()
    const federation = createFederation()

    federationStore.addFederation(federation, { recover: true })
    federationStore.selectedFederationId = federation.federationId

    let resolveRecovery: (() => void) | undefined
    const recoveryFinished = new Promise<void>((resolve) => {
      resolveRecovery = resolve
    })

    const wallet = createWalletMock(0)
    wallet.balance.getBalance = vi.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(34_000)
    wallet.recovery.hasPendingRecoveries.mockResolvedValue(true)
    wallet.recovery.waitForAllRecoveries.mockImplementation(() => recoveryFinished)
    fedimintClientMock.ensureWalletOpen.mockResolvedValue(wallet)

    await walletStore.openWallet()

    expect(walletStore.recoveryInProgress).toBe(true)
    expect(walletStore.balance).toBe(0)

    resolveRecovery?.()
    await vi.waitFor(() => {
      expect(walletStore.recoveryInProgress).toBe(false)
      expect(walletStore.balance).toBe(34)
      expect(walletStore.transactionsRefreshVersion).toBe(1)
      expect(federationStore.shouldRecoverFederation(federation.federationId)).toBe(false)
    })
  })

  it('passes forceRecover for federations explicitly marked for restore', async () => {
    const walletStore = useWalletStore()
    const federationStore = useFederationStore()
    const federation = createFederation()

    federationStore.addFederation(federation, { recover: true })
    federationStore.selectedFederationId = federation.federationId

    const wallet = createWalletMock(12_000)
    fedimintClientMock.ensureWalletOpen.mockResolvedValue(wallet)

    await walletStore.openWallet()

    expect(fedimintClientMock.ensureWalletOpen).toHaveBeenCalledWith({
      walletName: getWalletNameForFederationId(federation.federationId),
      federationId: federation.federationId,
      inviteCode: federation.inviteCode,
      forceRecover: true,
    })
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
    expect(federationStore.pendingRecoveryFederationIds).toEqual([])
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

  it('throws a descriptive error when ecash inspection is attempted', async () => {
    const walletStore = useWalletStore()
    await expect(walletStore.inspectEcash('notes-1')).rejects.toThrow(
      'eCash inspection is not supported by the current Fedimint SDK yet',
    )
    expect(fedimintClientMock.init).not.toHaveBeenCalled()
  })

  it('redeems ecash only through reissueExternalNotes on the open wallet', async () => {
    const walletStore = useWalletStore()
    const wallet = createWalletMock(12_000)
    walletStore.wallet = wallet as never

    await walletStore.redeemEcash('notes-import')

    expect(wallet.mint.reissueExternalNotes).toHaveBeenCalledWith('notes-import')
    expect(wallet.mint.subscribeReissueExternalNotes).toHaveBeenCalledTimes(1)
  })

  it('throws when redeeming ecash without an open wallet', async () => {
    const walletStore = useWalletStore()
    walletStore.wallet = null

    await expect(walletStore.redeemEcash('notes-import')).rejects.toThrow('Wallet is not open')
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

  it('sendOnchain submits a withdrawal and refreshes balance', async () => {
    const walletStore = useWalletStore()
    const wallet = createWalletMock(45_000)
    wallet.balance.getBalance = vi.fn().mockResolvedValueOnce(33_000)
    wallet.wallet.sendOnchain.mockResolvedValue({
      operation_id: 'withdraw-op-1',
    })
    walletStore.wallet = wallet as never

    const result = await walletStore.sendOnchain(' bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080 ', 21)

    expect(wallet.wallet.sendOnchain).toHaveBeenCalledWith(
      21,
      'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080',
      {},
    )
    expect(result).toEqual({
      operationId: 'withdraw-op-1',
    })
    expect(walletStore.balance).toBe(33)
  })

  it('sendOnchain rejects missing address before touching the wallet', async () => {
    const walletStore = useWalletStore()
    const wallet = createWalletMock(45_000)
    walletStore.wallet = wallet as never

    await expect(walletStore.sendOnchain('   ', 21)).rejects.toThrow('Bitcoin address is required')
    expect(wallet.wallet.sendOnchain).not.toHaveBeenCalled()
  })

  it('getTransactions normalizes wallet withdraw amount and fee from raw operation metadata', async () => {
    const walletStore = useWalletStore()
    const wallet = createWalletMock(45_000)
    wallet.federation.listTransactions.mockResolvedValue([
      {
        kind: 'wallet',
        operationId: 'wallet-op-1',
        type: 'withdraw',
        amountMsats: 0,
        fee: 2_000,
        onchainAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        outcome: 'Confirmed',
        timestamp: 1_234_567_890_000,
      },
    ])
    wallet.federation.listOperations.mockResolvedValue([
      [
        {
          creation_time: {
            nanos_since_epoch: 0,
            secs_since_epoch: 1_234_567_890,
          },
          operation_id: 'wallet-op-1',
        },
        {
          operation_module_kind: 'wallet',
          meta: {
            amount: 0,
            extra_meta: {},
            variant: {
              withdraw: {
                address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
                amountMsats: 2_000_000,
                fee: {
                  fee_rate: {
                    sats_per_kvb: 2_000,
                  },
                  total_weight: 560,
                },
              },
            },
          },
          outcome: {
            outcome: 'Confirmed',
          },
        },
      ],
    ])

    walletStore.wallet = wallet as never

    const transactions = await walletStore.getTransactions()

    expect(transactions).toHaveLength(1)
    expect(transactions[0]).toMatchObject({
      amountMsats: 2_000_000,
      fee: 280_000,
    })
  })

  it('getTransactions falls back to requested amount from extra_meta when wallet withdraw amount is missing', async () => {
    const walletStore = useWalletStore()
    const wallet = createWalletMock(45_000)
    wallet.federation.listTransactions.mockResolvedValue([
      {
        kind: 'wallet',
        operationId: 'wallet-op-2',
        type: 'withdraw',
        amountMsats: 0,
        fee: 0,
        onchainAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        outcome: 'Confirmed',
        timestamp: 1_234_567_890_000,
      },
    ])
    wallet.federation.listOperations.mockResolvedValue([
      [
        {
          creation_time: {
            nanos_since_epoch: 0,
            secs_since_epoch: 1_234_567_890,
          },
          operation_id: 'wallet-op-2',
        },
        {
          operation_module_kind: 'wallet',
          meta: {
            amount: 0,
            extra_meta: {
              requestedAmountSats: 2_000,
              requestedAmountMsats: 2_000_000,
            },
            variant: {
              withdraw: {
                address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
                amountMsats: 0,
                fee: {
                  fee_rate: {
                    sats_per_kvb: 3_365,
                  },
                  total_weight: 560,
                },
              },
            },
          },
          outcome: {
            outcome: 'Confirmed',
          },
        },
      ],
    ])

    walletStore.wallet = wallet as never

    const transactions = await walletStore.getTransactions()

    expect(transactions).toHaveLength(1)
    expect(transactions[0]).toMatchObject({
      amountMsats: 2_000_000,
      fee: 472_000,
    })
  })

  it('getTransactions reads wallet withdraw amount from raw variant.amount when amountMsats is missing', async () => {
    const walletStore = useWalletStore()
    const wallet = createWalletMock(45_000)
    wallet.federation.listTransactions.mockResolvedValue([
      {
        kind: 'wallet',
        operationId: 'wallet-op-3',
        type: 'withdraw',
        amountMsats: 0,
        fee: 0,
        onchainAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        outcome: 'Confirmed',
        timestamp: 1_234_567_890_000,
      },
    ])
    wallet.federation.listOperations.mockResolvedValue([
      [
        {
          creation_time: {
            nanos_since_epoch: 0,
            secs_since_epoch: 1_234_567_890,
          },
          operation_id: 'wallet-op-3',
        },
        {
          operation_module_kind: 'wallet',
          meta: {
            amount: 0,
            extra_meta: {},
            variant: {
              withdraw: {
                address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
                amount: 2_000,
                fee: {
                  fee_rate: {
                    sats_per_kvb: 3_365,
                  },
                  total_weight: 560,
                },
              },
            },
          },
          outcome: {
            outcome: 'Confirmed',
          },
        },
      ],
    ])

    walletStore.wallet = wallet as never

    const transactions = await walletStore.getTransactions()

    expect(transactions).toHaveLength(1)
    expect(transactions[0]).toMatchObject({
      amountMsats: 2_000_000,
      fee: 472_000,
    })
  })

  it('getTransactions falls back to raw transactions when operation metadata fetch fails', async () => {
    const walletStore = useWalletStore()
    const wallet = createWalletMock(45_000)
    wallet.federation.listTransactions.mockResolvedValue([
      {
        kind: 'wallet',
        operationId: 'wallet-op-4',
        type: 'withdraw',
        amountMsats: 2_000_000,
        fee: 471_000,
        onchainAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        outcome: 'Confirmed',
        timestamp: 1_234_567_890_000,
      },
    ])
    wallet.federation.listOperations.mockRejectedValue(new Error('RPC timeout'))

    walletStore.wallet = wallet as never

    const transactions = await walletStore.getTransactions()

    expect(transactions).toHaveLength(1)
    expect(wallet.federation.listTransactions).toHaveBeenCalledWith(10)
    expect(wallet.federation.listOperations).toHaveBeenCalledWith(10)
    expect(transactions[0]).toMatchObject({
      operationId: 'wallet-op-4',
      amountMsats: 2_000_000,
      fee: 471_000,
    })
  })

  it('getTransactionsPage returns paged transactions with cursor metadata', async () => {
    const walletStore = useWalletStore()
    const wallet = createWalletMock(0)
    const firstCursor = {
      operation_id: 'ln-op-1',
      creation_time: {
        secs_since_epoch: 1_234_567_890,
        nanos_since_epoch: 0,
      },
    }

    wallet.federation.listTransactions.mockResolvedValue([
      {
        kind: 'ln',
        operationId: 'ln-op-1',
        type: 'send',
        invoice: 'lnbc1test',
        amountMsats: 1_000,
        fee: 0,
        timestamp: 1_234_567_890_000,
      },
    ])
    wallet.federation.listOperations.mockResolvedValue([[firstCursor, { meta: {} }]])

    walletStore.wallet = wallet as never

    const page = await walletStore.getTransactionsPage(1)

    expect(wallet.federation.listTransactions).toHaveBeenCalledWith(1, undefined)
    expect(wallet.federation.listOperations).toHaveBeenCalledWith(1, undefined)
    expect(page.transactions).toHaveLength(1)
    expect(page.nextCursor).toEqual(firstCursor)
    expect(page.hasMore).toBe(true)
  })

  it('getTransactionsPage keeps fetching until it collects the requested visible transactions', async () => {
    const walletStore = useWalletStore()
    const wallet = createWalletMock(0)
    const nonTransactionCursor = {
      operation_id: 'non-transaction-op-3',
      creation_time: {
        secs_since_epoch: 1_234_567_891,
        nanos_since_epoch: 0,
      },
    }
    const secondPageCursor = {
      operation_id: 'wallet-op-4',
      creation_time: {
        secs_since_epoch: 1_234_567_892,
        nanos_since_epoch: 0,
      },
    }

    wallet.federation.listTransactions
      .mockResolvedValueOnce([
        {
          kind: 'ln',
          operationId: 'ln-op-1',
          type: 'send',
          invoice: 'lnbc1',
          amountMsats: 1_000,
          fee: 0,
          timestamp: 1,
        },
        {
          kind: 'mint',
          operationId: 'mint-op-2',
          type: 'receive',
          amountMsats: 2_000,
          timestamp: 2,
        },
      ])
      .mockResolvedValueOnce([
        {
          kind: 'wallet',
          operationId: 'wallet-op-4',
          type: 'deposit',
          onchainAddress: 'bc1qtest',
          amountMsats: 3_000,
          fee: 0,
          timestamp: 3,
        },
      ])
    wallet.federation.listOperations
      .mockResolvedValueOnce([
        [
          {
            operation_id: 'ln-op-1',
            creation_time: {
              secs_since_epoch: 1_234_567_889,
              nanos_since_epoch: 0,
            },
          },
          { meta: {} },
        ],
        [
          {
            operation_id: 'mint-op-2',
            creation_time: {
              secs_since_epoch: 1_234_567_890,
              nanos_since_epoch: 0,
            },
          },
          { meta: {} },
        ],
        [nonTransactionCursor, { meta: {} }],
      ])
      .mockResolvedValueOnce([[secondPageCursor, { meta: {} }]])

    walletStore.wallet = wallet as never

    const page = await walletStore.getTransactionsPage(3)

    expect(wallet.federation.listTransactions).toHaveBeenNthCalledWith(1, 3, undefined)
    expect(wallet.federation.listOperations).toHaveBeenNthCalledWith(1, 3, undefined)
    expect(wallet.federation.listTransactions).toHaveBeenNthCalledWith(2, 1, nonTransactionCursor)
    expect(wallet.federation.listOperations).toHaveBeenNthCalledWith(2, 1, nonTransactionCursor)
    expect(page.transactions.map((transaction) => transaction.operationId)).toEqual([
      'ln-op-1',
      'mint-op-2',
      'wallet-op-4',
    ])
    expect(page.nextCursor).toEqual(secondPageCursor)
    expect(page.hasMore).toBe(true)
  })

  it('getTransactionsPage clears the cursor when the backend is exhausted', async () => {
    const walletStore = useWalletStore()
    const wallet = createWalletMock(0)

    wallet.federation.listTransactions.mockResolvedValue([
      {
        kind: 'ln',
        operationId: 'ln-op-1',
        type: 'send',
        invoice: 'lnbc1',
        amountMsats: 1_000,
        fee: 0,
        timestamp: 1,
      },
    ])
    wallet.federation.listOperations.mockResolvedValue([
      [
        {
          operation_id: 'ln-op-1',
          creation_time: {
            secs_since_epoch: 1_234_567_890,
            nanos_since_epoch: 0,
          },
        },
        { meta: {} },
      ],
    ])

    walletStore.wallet = wallet as never

    const page = await walletStore.getTransactionsPage(3)

    expect(page.transactions).toHaveLength(1)
    expect(page.nextCursor).toBeNull()
    expect(page.hasMore).toBe(false)
  })

  it('getTransactionsPage falls back to raw transactions when operation metadata fetch fails', async () => {
    const walletStore = useWalletStore()
    const wallet = createWalletMock(0)

    wallet.federation.listTransactions.mockResolvedValue([
      {
        kind: 'wallet',
        operationId: 'wallet-op-raw',
        type: 'withdraw',
        amountMsats: 2_000_000,
        fee: 471_000,
        onchainAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        outcome: 'Confirmed',
        timestamp: 1_234_567_890_000,
      },
    ])
    wallet.federation.listOperations.mockRejectedValue(new Error('RPC timeout'))

    walletStore.wallet = wallet as never

    const page = await walletStore.getTransactionsPage(10)

    expect(wallet.federation.listTransactions).toHaveBeenCalledWith(10, undefined)
    expect(wallet.federation.listOperations).toHaveBeenCalledWith(10, undefined)
    expect(page.transactions).toHaveLength(1)
    expect(page.transactions[0]).toMatchObject({
      operationId: 'wallet-op-raw',
      amountMsats: 2_000_000,
      fee: 471_000,
    })
    expect(page.nextCursor).toBeNull()
    expect(page.hasMore).toBe(false)
  })

  it('getTransactionsPage keeps wallet normalization in paged mode', async () => {
    const walletStore = useWalletStore()
    const wallet = createWalletMock(0)

    wallet.federation.listTransactions.mockResolvedValue([
      {
        kind: 'wallet',
        operationId: 'wallet-op-1',
        type: 'withdraw',
        onchainAddress: 'bc1qtest',
        amountMsats: 0,
        fee: 0,
        timestamp: 1,
      },
    ])
    wallet.federation.listOperations.mockResolvedValue([
      [
        {
          operation_id: 'wallet-op-1',
          creation_time: {
            secs_since_epoch: 1_234_567_890,
            nanos_since_epoch: 0,
          },
        },
        {
          meta: {
            variant: {
              withdraw: {
                amount: 42,
                fee: {
                  fee_rate: {
                    sats_per_kvb: 2_000,
                  },
                  total_weight: 600,
                },
              },
            },
          },
        },
      ],
    ])

    walletStore.wallet = wallet as never

    const page = await walletStore.getTransactionsPage(1)
    const transaction = page.transactions[0]

    expect(transaction).toBeDefined()
    if (transaction == null) {
      throw new Error('Expected paged wallet transaction')
    }
    expect(transaction.kind).toBe('wallet')
    expect((transaction as { amountMsats: number }).amountMsats).toBe(42_000)
    expect((transaction as { fee: number }).fee).toBe(300_000)
  })

  it('getTransactionByOperationId pages until it finds an older transaction', async () => {
    const walletStore = useWalletStore()
    const wallet = createWalletMock(0)
    const firstCursor = {
      operation_id: 'ln-op-1',
      creation_time: {
        secs_since_epoch: 1_234_567_890,
        nanos_since_epoch: 0,
      },
    }

    wallet.federation.listTransactions
      .mockResolvedValueOnce([
        {
          kind: 'ln',
          operationId: 'ln-op-1',
          type: 'send',
          invoice: 'lnbc1',
          amountMsats: 1_000,
          fee: 0,
          timestamp: 1,
        },
      ])
      .mockResolvedValueOnce([
        {
          kind: 'wallet',
          operationId: 'wallet-op-target',
          type: 'withdraw',
          onchainAddress: 'bc1qtarget',
          amountMsats: 2_000,
          fee: 0,
          timestamp: 2,
        },
      ])
    wallet.federation.listOperations
      .mockResolvedValueOnce([
        ...Array.from({ length: 49 }, (_value, index) => [
          {
            operation_id: `non-transaction-op-${index + 1}`,
            creation_time: {
              secs_since_epoch: 1_234_567_800 + index,
              nanos_since_epoch: 0,
            },
          },
          { meta: {} },
        ]),
        [firstCursor, { meta: {} }],
      ])
      .mockResolvedValueOnce([
        [
          {
            operation_id: 'wallet-op-target',
            creation_time: {
              secs_since_epoch: 1_234_567_891,
              nanos_since_epoch: 0,
            },
          },
          { meta: {} },
        ],
      ])

    walletStore.wallet = wallet as never

    const transaction = await walletStore.getTransactionByOperationId('wallet-op-target')

    expect(transaction?.operationId).toBe('wallet-op-target')
    expect(wallet.federation.listTransactions).toHaveBeenNthCalledWith(1, 50, undefined)
    expect(wallet.federation.listTransactions).toHaveBeenNthCalledWith(2, 49, firstCursor)
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
