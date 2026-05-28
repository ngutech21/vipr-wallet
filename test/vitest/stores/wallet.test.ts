import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Federation } from 'src/types/federation'

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
  parseOobNotes: vi.fn(),
  reset: vi.fn(),
}))

vi.mock('src/services/fedimint-client', () => ({
  fedimintClient: fedimintClientMock,
}))

import {
  FEDIMINT_MNEMONIC_BACKUP_CONFIRMED_KEY,
  FEDIMINT_STORAGE_SCHEMA_KEY,
  FEDIMINT_STORAGE_SCHEMA_VERSION,
  FEDIMINT_WALLET_RESTORED_KEY,
  getWalletNameForFederationId,
  mapTxOutputSummaryToFederationUtxo,
  parseOutpoint,
  useWalletStore,
} from 'src/stores/wallet'
import { useFederationStore } from 'src/stores/federation'
import type { Transactions, TxOutputSummary } from '@fedimint/core'

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

function createMetaModule() {
  return {
    config: 'meta',
    kind: 'meta',
    version: {
      major: 0,
      minor: 0,
    },
  }
}

type RecoveryProgressEvent = {
  module_id: number
  progress: unknown
}

function createWalletMock(balanceMsats: number) {
  return {
    isOpen: vi.fn(() => true),
    open: vi.fn(),
    joinFederation: vi.fn(),
    cleanup: vi.fn(),
    federation: {
      getFederationId: vi.fn(() => Promise.resolve('fed-1')),
      getMetaConsensusValue: vi.fn<() => Promise<unknown>>(() => Promise.resolve(null)),
      listTransactions: vi.fn(),
      listOperations: vi.fn(),
      getEventLog: vi.fn(),
    },
    mint: {
      parseNotes: vi.fn(() => Promise.resolve(12_000)),
      reissueExternalNotes: vi.fn(() => Promise.resolve('op-1')),
      subscribeReissueExternalNotes: vi.fn(),
      spendNotes: vi.fn(),
      subscribeSpendNotes: vi.fn(),
      getNotesByDenomination: vi.fn(() => Promise.resolve({})),
    },
    lightning: {
      updateGatewayCache: vi.fn(() => Promise.resolve()),
    },
    balance: {
      getBalance: vi.fn(() => Promise.resolve(balanceMsats)),
    },
    wallet: {
      getWalletSummary: vi.fn(),
      sendOnchain: vi.fn(),
    },
    recovery: {
      hasPendingRecoveries: vi.fn(() => Promise.resolve(false)),
      waitForAllRecoveries: vi.fn(() => Promise.resolve()),
      subscribeToRecoveryProgress: vi.fn(
        (
          _onSuccess: (progress: RecoveryProgressEvent) => void,
          _onError: (error: string) => void,
        ) => vi.fn(),
      ),
    },
  }
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, resolve, reject }
}

function createHiddenTransaction(operationId: string): Transactions {
  return {
    kind: 'unknown',
    operationId,
    timestamp: 1,
  } as unknown as Transactions
}

function createEventLogEntry({
  module,
  kind,
  payload,
  tsUsecs = 1_234_567_890_000_000,
}: {
  module: string
  kind: string
  payload: Record<string, unknown>
  tsUsecs?: number
}) {
  return {
    id: tsUsecs,
    kind,
    module: [module, 0],
    ts_usecs: tsUsecs,
    payload,
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
    fedimintClientMock.parseOobNotes.mockResolvedValue({
      total_amount: 12_000,
      federation_id_prefix: 'fed1',
      federation_id: 'fed-1',
      invite_code: 'fed11testinvite',
      note_counts: { '1000': 12 },
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

    expect(fedimintClientMock.getMnemonicIfSet).toHaveBeenCalledTimes(1)
    expect(fedimintClientMock.ensureWalletOpen).toHaveBeenCalledWith({
      walletName: getWalletNameForFederationId(federation.federationId),
      federationId: federation.federationId,
      inviteCode: federation.inviteCode,
      recoverOnJoin: false,
    })
    expect(walletStore.activeWalletName).toBe(getWalletNameForFederationId(federation.federationId))
    expect(walletStore.balance).toBe(12)
    expect(walletStore.transactionsRefreshVersion).toBe(1)
    expect(wallet.lightning.updateGatewayCache).toHaveBeenCalledTimes(1)
  })

  it('keeps opening the wallet when gateway cache refresh fails', async () => {
    const walletStore = useWalletStore()
    const federationStore = useFederationStore()
    const federation = createFederation()

    federationStore.federations = [federation]
    federationStore.selectedFederationId = federation.federationId

    const wallet = createWalletMock(12_000)
    wallet.lightning.updateGatewayCache.mockRejectedValue(new Error('gateway unavailable'))
    fedimintClientMock.ensureWalletOpen.mockResolvedValue(wallet)

    await walletStore.openWallet()

    expect(walletStore.activeWalletName).toBe(getWalletNameForFederationId(federation.federationId))
    expect(walletStore.balance).toBe(12)
    expect(wallet.lightning.updateGatewayCache).toHaveBeenCalledTimes(1)
  })

  it('passes recoverOnJoin to the Fedimint client only when requested', async () => {
    const walletStore = useWalletStore()
    const federationStore = useFederationStore()
    const federation = createFederation()

    federationStore.federations = [federation]
    federationStore.selectedFederationId = federation.federationId

    const wallet = createWalletMock(12_000)
    fedimintClientMock.ensureWalletOpen.mockResolvedValue(wallet)

    await walletStore.openWallet({ recoverOnJoin: true })

    expect(fedimintClientMock.ensureWalletOpen).toHaveBeenCalledWith({
      walletName: getWalletNameForFederationId(federation.federationId),
      federationId: federation.federationId,
      inviteCode: federation.inviteCode,
      recoverOnJoin: true,
    })
  })

  it('serializes concurrent wallet opens so only one ensureWalletOpen runs at a time', async () => {
    const walletStore = useWalletStore()
    const federationStore = useFederationStore()
    const firstFederation = createFederation({ federationId: 'fed-1', inviteCode: 'fed11first' })
    const secondFederation = createFederation({ federationId: 'fed-2', inviteCode: 'fed11second' })
    const firstWallet = createWalletMock(12_000)
    const secondWallet = createWalletMock(34_000)
    const firstOpen = createDeferred<typeof firstWallet>()

    federationStore.federations = [firstFederation, secondFederation]
    federationStore.selectedFederationId = firstFederation.federationId
    fedimintClientMock.ensureWalletOpen
      .mockReturnValueOnce(firstOpen.promise)
      .mockResolvedValueOnce(secondWallet)

    const firstOpenAttempt = walletStore.openWallet()
    await vi.waitFor(() => {
      expect(fedimintClientMock.ensureWalletOpen).toHaveBeenCalledTimes(1)
    })

    federationStore.selectedFederationId = secondFederation.federationId
    const secondOpenAttempt = walletStore.openWallet()
    await Promise.resolve()

    expect(fedimintClientMock.ensureWalletOpen).toHaveBeenCalledTimes(1)

    firstOpen.resolve(firstWallet)
    await firstOpenAttempt
    await secondOpenAttempt

    expect(fedimintClientMock.ensureWalletOpen).toHaveBeenNthCalledWith(1, {
      walletName: getWalletNameForFederationId(firstFederation.federationId),
      federationId: firstFederation.federationId,
      inviteCode: firstFederation.inviteCode,
      recoverOnJoin: false,
    })
    expect(fedimintClientMock.ensureWalletOpen).toHaveBeenNthCalledWith(2, {
      walletName: getWalletNameForFederationId(secondFederation.federationId),
      federationId: secondFederation.federationId,
      inviteCode: secondFederation.inviteCode,
      recoverOnJoin: false,
    })
    expect(walletStore.activeWalletName).toBe(
      getWalletNameForFederationId(secondFederation.federationId),
    )
    expect(walletStore.balance).toBe(34)
  })

  it('refreshes selected federation metadata from the meta module after opening', async () => {
    const walletStore = useWalletStore()
    const federationStore = useFederationStore()
    const federation = createFederation({
      title: 'Legacy Federation',
      modules: [createMetaModule()],
      metadata: {
        iconUrl: 'https://legacy.example/icon.png',
        maxInvoiceMsats: 50_000,
      },
    })

    federationStore.federations = [federation]
    federationStore.selectedFederationId = federation.federationId

    const wallet = createWalletMock(12_000)
    wallet.federation.getMetaConsensusValue.mockResolvedValue({
      revision: 1,
      value: {
        federation_name: 'Meta Federation',
        'fedi:federation_icon_url': 'https://meta.example/icon.png',
        'fedi:max_invoice_msats': 75_000,
      },
    })
    fedimintClientMock.ensureWalletOpen.mockResolvedValue(wallet)

    await walletStore.openWallet()

    expect(federationStore.federations[0]?.title).toBe('Meta Federation')
    expect(federationStore.federations[0]?.metadata).toMatchObject({
      federationName: 'Meta Federation',
      iconUrl: 'https://meta.example/icon.png',
      maxInvoiceMsats: 75_000,
    })
  })

  it('starts recovery monitoring after opening a federation with pending recoveries', async () => {
    const walletStore = useWalletStore()
    const federationStore = useFederationStore()
    const federation = createFederation()
    const recoveryDone = createDeferred<void>()
    const unsubscribe = vi.fn()

    federationStore.federations = [federation]
    federationStore.selectedFederationId = federation.federationId

    const recoveryWallet = createWalletMock(12_000)
    const reopenedWallet = createWalletMock(34_000)
    recoveryWallet.recovery.hasPendingRecoveries.mockResolvedValue(true)
    recoveryWallet.recovery.waitForAllRecoveries.mockReturnValue(recoveryDone.promise)
    recoveryWallet.recovery.subscribeToRecoveryProgress.mockImplementation((onSuccess) => {
      onSuccess({
        module_id: 0,
        progress: {
          complete: 1,
          total: 2,
        },
      })
      return unsubscribe
    })
    fedimintClientMock.ensureWalletOpen
      .mockResolvedValueOnce(recoveryWallet)
      .mockResolvedValueOnce(reopenedWallet)

    await walletStore.openWallet({ expectRecovery: true })

    await vi.waitFor(() => {
      expect(recoveryWallet.recovery.hasPendingRecoveries).toHaveBeenCalledTimes(1)
      expect(walletStore.recoveryInProgress).toBe(true)
    })
    expect(recoveryWallet.recovery.subscribeToRecoveryProgress).toHaveBeenCalledTimes(1)
    expect(walletStore.recoveryStatusByFederationId[federation.federationId]).toBe('restoring')
    expect(walletStore.recoveryProgressByModule[0]).toEqual({
      complete: 1,
      total: 2,
    })

    recoveryDone.resolve()

    await vi.waitFor(
      () => {
        expect(walletStore.recoveryInProgress).toBe(false)
        expect(walletStore.recoveryStatusByFederationId[federation.federationId]).toBe('restored')
      },
      { timeout: 5_000 },
    )
    expect(fedimintClientMock.closeActiveWallet).toHaveBeenCalledTimes(1)
    expect(fedimintClientMock.ensureWalletOpen).toHaveBeenNthCalledWith(2, {
      walletName: getWalletNameForFederationId(federation.federationId),
      federationId: federation.federationId,
      inviteCode: federation.inviteCode,
      recoverOnJoin: false,
    })
    expect(reopenedWallet.mint.getNotesByDenomination).toHaveBeenCalled()
    expect(reopenedWallet.balance.getBalance).toHaveBeenCalled()
    expect(walletStore.balance).toBe(34)
    expect(walletStore.transactionsRefreshVersion).toBe(2)
    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('marks expected recovery as no backup when the federation has no pending recoveries', async () => {
    const walletStore = useWalletStore()
    const federationStore = useFederationStore()
    const federation = createFederation()

    federationStore.federations = [federation]
    federationStore.selectedFederationId = federation.federationId

    const wallet = createWalletMock(12_000)
    wallet.recovery.hasPendingRecoveries.mockResolvedValue(false)
    fedimintClientMock.ensureWalletOpen.mockResolvedValue(wallet)

    await walletStore.openWallet({ expectRecovery: true })

    await vi.waitFor(() => {
      expect(wallet.recovery.hasPendingRecoveries).toHaveBeenCalledTimes(1)
      expect(walletStore.recoveryStatusByFederationId[federation.federationId]).toBe('no-backup')
    })
    expect(walletStore.recoveryInProgress).toBe(false)
    expect(wallet.recovery.waitForAllRecoveries).not.toHaveBeenCalled()
  })

  it('marks the active restoring federation as failed when canceling its recovery monitor', async () => {
    const walletStore = useWalletStore()
    const federationStore = useFederationStore()
    const federation = createFederation()
    const recoveryDone = createDeferred<void>()

    federationStore.federations = [federation]
    federationStore.selectedFederationId = federation.federationId

    const wallet = createWalletMock(12_000)
    wallet.recovery.hasPendingRecoveries.mockResolvedValue(true)
    wallet.recovery.waitForAllRecoveries.mockReturnValue(recoveryDone.promise)
    fedimintClientMock.ensureWalletOpen.mockResolvedValue(wallet)

    await walletStore.openWallet({ expectRecovery: true })

    await vi.waitFor(() => {
      expect(walletStore.recoveryInProgress).toBe(true)
      expect(walletStore.recoveryStatusByFederationId[federation.federationId]).toBe('restoring')
    })

    await walletStore.closeWallet()

    expect(walletStore.recoveryInProgress).toBe(false)
    expect(walletStore.recoveryStatusByFederationId[federation.federationId]).toBe('failed')
    expect(walletStore.recoveryError).toBe(null)
  })

  it('previews a federation with normalized config and legacy metadata', async () => {
    const walletStore = useWalletStore()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          default: {
            federation_icon_url: 'https://legacy.example/icon.png',
            default_currency: 'USD',
            max_invoice_msats: '50000',
          },
        }),
    })
    vi.stubGlobal('fetch', fetchMock)
    fedimintClientMock.previewFederation.mockResolvedValue({
      federation_id: 'fed-preview',
      config: {
        global: {
          meta: {
            federation_name: 'Preview Federation',
            meta_external_url: 'https://meta.example/federation.json',
          },
          api_endpoints: {},
        },
        modules: {
          '1': {
            config: 'mint',
            kind: 'mint',
            version: {
              major: 0,
              minor: 0,
            },
          },
        },
      },
    })

    const federation = await walletStore.previewFederation('fed11preview')

    expect(fetchMock).toHaveBeenCalledWith('https://meta.example/federation.json')
    expect(federation).toMatchObject({
      title: 'Preview Federation',
      federationId: 'fed-preview',
      metadata: {
        federationName: 'Preview Federation',
        iconUrl: 'https://legacy.example/icon.png',
        defaultCurrency: 'USD',
        maxInvoiceMsats: 50_000,
      },
      modules: [
        {
          id: '1',
          kind: 'mint',
        },
      ],
    })
    vi.unstubAllGlobals()
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
    expect(localStorage.getItem(FEDIMINT_WALLET_RESTORED_KEY)).toBe('0')
    expect(walletStore.wasRestoredFromMnemonic).toBe(false)

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
    expect(localStorage.getItem(FEDIMINT_WALLET_RESTORED_KEY)).toBe('0')
    expect(walletStore.wasRestoredFromMnemonic).toBe(false)
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

    expect(fedimintClientMock.clearAllWallets).toHaveBeenCalledTimes(1)
    expect(fedimintClientMock.clearAllWallets.mock.invocationCallOrder[0]).toBeLessThan(
      fedimintClientMock.setMnemonic.mock.invocationCallOrder[0] ?? 0,
    )
    expect(fedimintClientMock.setMnemonic).toHaveBeenCalledTimes(1)
    expect(walletStore.hasMnemonic).toBe(true)
    expect(walletStore.needsMnemonicBackup).toBe(false)
    expect(localStorage.getItem(FEDIMINT_MNEMONIC_BACKUP_CONFIRMED_KEY)).toBe('1')
    expect(localStorage.getItem(FEDIMINT_WALLET_RESTORED_KEY)).toBe('1')
    expect(walletStore.wasRestoredFromMnemonic).toBe(true)
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

  it('inspects ecash notes and matches an already joined federation', async () => {
    const walletStore = useWalletStore()
    const federationStore = useFederationStore()
    const federation = createFederation()
    federationStore.federations = [federation]

    const inspection = await walletStore.inspectEcash('notes-1')

    expect(fedimintClientMock.parseOobNotes).toHaveBeenCalledWith('notes-1')
    expect(inspection).toEqual({
      amountMsats: 12_000,
      amountSats: 12,
      parsed: {
        total_amount: 12_000,
        federation_id_prefix: 'fed1',
        federation_id: 'fed-1',
        invite_code: 'fed11testinvite',
        note_counts: { '1000': 12 },
      },
      matchedFederation: federation,
      inviteCode: 'fed11testinvite',
      requiresJoin: false,
    })
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

  it('spendEcashOffline blocks sends while recovery is running', async () => {
    const walletStore = useWalletStore()
    const wallet = createWalletMock(21_000)
    walletStore.wallet = wallet as never
    walletStore.recoveryInProgress = true

    await expect(walletStore.spendEcashOffline(1)).rejects.toThrow(
      'Wallet recovery is still running',
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

  it('sendOnchain blocks sends while recovery is running', async () => {
    const walletStore = useWalletStore()
    const wallet = createWalletMock(45_000)
    walletStore.wallet = wallet as never
    walletStore.recoveryInProgress = true

    await expect(
      walletStore.sendOnchain('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 1),
    ).rejects.toThrow('Wallet recovery is still running')
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

  it('getTransactions reads wallet deposit amount from the raw deposit outcome', async () => {
    const walletStore = useWalletStore()
    const wallet = createWalletMock(45_000)
    wallet.federation.listTransactions.mockResolvedValue([
      {
        kind: 'wallet',
        operationId: 'wallet-deposit-op-1',
        type: 'deposit',
        amountMsats: 0,
        fee: 0,
        onchainAddress: 'bcrt1qdeposit',
        outcome: 'Claimed',
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
          operation_id: 'wallet-deposit-op-1',
        },
        {
          operation_module_kind: 'wallet',
          meta: {
            amount: 0,
            extra_meta: {},
            variant: {
              deposit: {
                address: 'bcrt1qdeposit',
                tweak_idx: 0,
              },
            },
          },
          outcome: {
            outcome: {
              Claimed: {
                btc_deposited: 210_000,
                btc_out_point: {
                  txid: 'deposit-txid',
                  vout: 0,
                },
              },
            },
          },
        },
      ],
    ])

    walletStore.wallet = wallet as never

    const transactions = await walletStore.getTransactions()

    expect(transactions).toHaveLength(1)
    expect(transactions[0]).toMatchObject({
      amountMsats: 210_000_000,
      fee: 0,
      type: 'deposit',
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
    const secondCursor = {
      operation_id: 'ln-op-2',
      creation_time: {
        secs_since_epoch: 1_234_567_891,
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
      {
        kind: 'ln',
        operationId: 'ln-op-2',
        type: 'receive',
        invoice: 'lnbc1test2',
        amountMsats: 2_000,
        fee: 0,
        timestamp: 1_234_567_891_000,
      },
    ])
    wallet.federation.listOperations.mockResolvedValue([
      [firstCursor, { meta: {} }],
      [secondCursor, { meta: {} }],
    ])

    walletStore.wallet = wallet as never

    const page = await walletStore.getTransactionsPage(1)

    expect(wallet.federation.listTransactions).toHaveBeenCalledWith(2, undefined)
    expect(wallet.federation.listOperations).toHaveBeenCalledWith(2, undefined)
    expect(page.transactions).toHaveLength(1)
    expect(page.nextCursor).toEqual(firstCursor)
    expect(page.hasMore).toBe(true)
  })

  it('getTransactionsPage does not report more when the visible count matches the page size exactly', async () => {
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

    expect(wallet.federation.listTransactions).toHaveBeenCalledWith(2, undefined)
    expect(wallet.federation.listOperations).toHaveBeenCalledWith(2, undefined)
    expect(page.transactions).toHaveLength(1)
    expect(page.nextCursor).toBeNull()
    expect(page.hasMore).toBe(false)
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
        {
          kind: 'wallet',
          operationId: 'wallet-op-5',
          type: 'withdraw',
          onchainAddress: 'bc1qtest-2',
          amountMsats: 4_000,
          fee: 0,
          timestamp: 4,
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
        [
          {
            operation_id: 'non-transaction-op-4',
            creation_time: {
              secs_since_epoch: 1_234_567_891,
              nanos_since_epoch: 0,
            },
          },
          { meta: {} },
        ],
      ])
      .mockResolvedValueOnce([
        [secondPageCursor, { meta: {} }],
        [
          {
            operation_id: 'wallet-op-5',
            creation_time: {
              secs_since_epoch: 1_234_567_893,
              nanos_since_epoch: 0,
            },
          },
          { meta: {} },
        ],
      ])

    walletStore.wallet = wallet as never

    const page = await walletStore.getTransactionsPage(3)

    expect(wallet.federation.listTransactions).toHaveBeenNthCalledWith(1, 4, undefined)
    expect(wallet.federation.listOperations).toHaveBeenNthCalledWith(1, 4, undefined)
    expect(wallet.federation.listTransactions).toHaveBeenNthCalledWith(2, 2, {
      operation_id: 'non-transaction-op-4',
      creation_time: {
        secs_since_epoch: 1_234_567_891,
        nanos_since_epoch: 0,
      },
    })
    expect(wallet.federation.listOperations).toHaveBeenNthCalledWith(2, 2, {
      operation_id: 'non-transaction-op-4',
      creation_time: {
        secs_since_epoch: 1_234_567_891,
        nanos_since_epoch: 0,
      },
    })
    expect(page.transactions.map((transaction) => transaction.operationId)).toEqual([
      'ln-op-1',
      'mint-op-2',
      'wallet-op-4',
    ])
    expect(page.nextCursor).toEqual(secondPageCursor)
    expect(page.hasMore).toBe(true)
  })

  it('getTransactionsPage with visibleOnly skips non-renderable transactions when paging', async () => {
    const walletStore = useWalletStore()
    const wallet = createWalletMock(0)
    const hiddenCursor = {
      operation_id: 'hidden-op-1',
      creation_time: {
        secs_since_epoch: 1_234_567_890,
        nanos_since_epoch: 0,
      },
    }
    const firstPageTailCursor = {
      operation_id: 'hidden-tail-op-1',
      creation_time: {
        secs_since_epoch: 1_234_567_891,
        nanos_since_epoch: 0,
      },
    }
    const visibleCursor = {
      operation_id: 'wallet-op-2',
      creation_time: {
        secs_since_epoch: 1_234_567_892,
        nanos_since_epoch: 0,
      },
    }

    wallet.federation.listTransactions
      .mockResolvedValueOnce([createHiddenTransaction('hidden-op-1')])
      .mockResolvedValueOnce([
        {
          kind: 'wallet',
          operationId: 'wallet-op-2',
          type: 'deposit',
          onchainAddress: 'bc1qvisible',
          amountMsats: 2_000,
          fee: 0,
          timestamp: 2,
        },
      ])

    wallet.federation.listOperations
      .mockResolvedValueOnce([
        [hiddenCursor, { meta: {} }],
        [firstPageTailCursor, { meta: {} }],
      ])
      .mockResolvedValueOnce([[visibleCursor, { meta: {} }]])

    walletStore.wallet = wallet as never

    const page = await walletStore.getTransactionsPage(1, undefined, { visibleOnly: true })

    expect(wallet.federation.listTransactions).toHaveBeenNthCalledWith(1, 2, undefined)
    expect(wallet.federation.listTransactions).toHaveBeenNthCalledWith(2, 2, firstPageTailCursor)
    expect(page.transactions.map((transaction) => transaction.operationId)).toEqual(['wallet-op-2'])
    expect(page.hasMore).toBe(false)
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

    expect(wallet.federation.listTransactions).toHaveBeenCalledWith(11, undefined)
    expect(wallet.federation.listOperations).toHaveBeenCalledWith(11, undefined)
    expect(page.transactions).toHaveLength(1)
    expect(page.transactions[0]).toMatchObject({
      operationId: 'wallet-op-raw',
      amountMsats: 2_000_000,
      fee: 471_000,
    })
    expect(page.nextCursor).toBeNull()
    expect(page.hasMore).toBe(false)
  })

  it('getTransactionsPage does not read event log when a non-restored wallet has no transactions', async () => {
    const walletStore = useWalletStore()
    const wallet = createWalletMock(0)

    wallet.federation.listTransactions.mockResolvedValue([])
    wallet.federation.listOperations.mockResolvedValue([])
    walletStore.wallet = wallet as never

    const page = await walletStore.getTransactionsPage(10)

    expect(page.transactions).toEqual([])
    expect(wallet.federation.getEventLog).not.toHaveBeenCalled()
  })

  it('getTransactionsPage uses event log fallback when a restored wallet has no normal transactions', async () => {
    const walletStore = useWalletStore()
    const wallet = createWalletMock(0)

    wallet.federation.listTransactions.mockResolvedValue([])
    wallet.federation.listOperations.mockResolvedValue([])
    wallet.federation.getEventLog.mockResolvedValue([
      createEventLogEntry({
        module: 'lnv2',
        kind: 'payment-receive',
        payload: {
          operation_id: 'ln-restored-receive',
          amount: 21_000,
        },
      }),
    ])
    walletStore.wallet = wallet as never
    walletStore.wasRestoredFromMnemonic = true

    const page = await walletStore.getTransactionsPage(10)

    expect(wallet.federation.getEventLog).toHaveBeenCalledWith({ pos: 0, limit: 10_000 })
    expect(page.transactions).toHaveLength(1)
    expect(page.transactions[0]).toMatchObject({
      kind: 'ln',
      operationId: 'ln-restored-receive',
      type: 'receive',
      amountMsats: 21_000,
      outcome: 'claimed',
      txId: '',
    })
    expect(page.hasMore).toBe(false)
    expect(page.nextCursor).toBeNull()
  })

  it('getTransactionsPage paginates restored event log fallback with an internal cursor', async () => {
    const walletStore = useWalletStore()
    const wallet = createWalletMock(0)

    wallet.federation.listTransactions.mockResolvedValue([])
    wallet.federation.listOperations.mockResolvedValue([])
    wallet.federation.getEventLog.mockResolvedValue([
      createEventLogEntry({
        module: 'lnv2',
        kind: 'payment-receive',
        payload: {
          operation_id: 'ln-restored-newest',
          amount: 21_000,
        },
        tsUsecs: 3_000_000,
      }),
      createEventLogEntry({
        module: 'lnv2',
        kind: 'payment-receive',
        payload: {
          operation_id: 'ln-restored-middle',
          amount: 22_000,
        },
        tsUsecs: 2_000_000,
      }),
      createEventLogEntry({
        module: 'lnv2',
        kind: 'payment-receive',
        payload: {
          operation_id: 'ln-restored-oldest',
          amount: 23_000,
        },
        tsUsecs: 1_000_000,
      }),
    ])
    walletStore.wallet = wallet as never
    walletStore.wasRestoredFromMnemonic = true

    const firstPage = await walletStore.getTransactionsPage(2)
    const secondPage = await walletStore.getTransactionsPage(2, firstPage.nextCursor ?? undefined)

    expect(firstPage.transactions.map((transaction) => transaction.operationId)).toEqual([
      'ln-restored-newest',
      'ln-restored-middle',
    ])
    expect(firstPage.hasMore).toBe(true)
    expect(firstPage.nextCursor?.operation_id).toBe('vipr-restored-eventlog:ln-restored-middle')
    expect(secondPage.transactions.map((transaction) => transaction.operationId)).toEqual([
      'ln-restored-oldest',
    ])
    expect(secondPage.hasMore).toBe(false)
    expect(secondPage.nextCursor).toBeNull()
    expect(wallet.federation.listTransactions).toHaveBeenCalledTimes(1)
    expect(wallet.federation.listOperations).toHaveBeenCalledTimes(1)
    expect(wallet.federation.getEventLog).toHaveBeenCalledTimes(2)
  })

  it('getTransactionsPage reads subsequent event log windows for restored fallback', async () => {
    const walletStore = useWalletStore()
    const wallet = createWalletMock(0)

    wallet.federation.listTransactions.mockResolvedValue([])
    wallet.federation.listOperations.mockResolvedValue([])
    wallet.federation.getEventLog
      .mockResolvedValueOnce(
        Array.from({ length: 10_000 }, (_value, index) =>
          createEventLogEntry({
            module: 'lnv2',
            kind: 'ignored-event',
            payload: {
              operation_id: `ignored-${index}`,
              amount: 1_000,
            },
            tsUsecs: index + 1,
          }),
        ),
      )
      .mockResolvedValueOnce([
        createEventLogEntry({
          module: 'lnv2',
          kind: 'payment-receive',
          payload: {
            operation_id: 'ln-restored-after-first-window',
            amount: 21_000,
          },
          tsUsecs: 10_001,
        }),
      ])
    walletStore.wallet = wallet as never
    walletStore.wasRestoredFromMnemonic = true

    const page = await walletStore.getTransactionsPage(10)

    expect(wallet.federation.getEventLog).toHaveBeenNthCalledWith(1, {
      pos: 0,
      limit: 10_000,
    })
    expect(wallet.federation.getEventLog).toHaveBeenNthCalledWith(2, {
      pos: 10_000,
      limit: 10_000,
    })
    expect(page.transactions.map((transaction) => transaction.operationId)).toEqual([
      'ln-restored-after-first-window',
    ])
    expect(page.hasMore).toBe(false)
    expect(page.nextCursor).toBeNull()
  })

  it('getTransactionsPage does not read event log when restored wallet has normal transactions', async () => {
    const walletStore = useWalletStore()
    const wallet = createWalletMock(0)

    wallet.federation.listTransactions.mockResolvedValue([
      {
        kind: 'mint',
        operationId: 'mint-op-1',
        type: 'reissue',
        amountMsats: 21_000,
        timestamp: 1,
      },
    ])
    wallet.federation.listOperations.mockResolvedValue([
      [
        {
          operation_id: 'mint-op-1',
          creation_time: {
            secs_since_epoch: 1,
            nanos_since_epoch: 0,
          },
        },
        { meta: {} },
      ],
    ])
    walletStore.wallet = wallet as never
    walletStore.wasRestoredFromMnemonic = true

    const page = await walletStore.getTransactionsPage(10)

    expect(page.transactions.map((transaction) => transaction.operationId)).toEqual(['mint-op-1'])
    expect(wallet.federation.getEventLog).not.toHaveBeenCalled()
  })

  it('getTransactionsPage maps known payment event log entries and ignores unknown entries', async () => {
    const walletStore = useWalletStore()
    const wallet = createWalletMock(0)

    wallet.federation.listTransactions.mockResolvedValue([])
    wallet.federation.listOperations.mockResolvedValue([])
    wallet.federation.getEventLog.mockResolvedValue([
      createEventLogEntry({
        module: 'ln',
        kind: 'payment-send',
        payload: {
          operation_id: 'ln-send',
          amount: 11_000,
          fee: 1_000,
        },
        tsUsecs: 1_000_000,
      }),
      createEventLogEntry({
        module: 'ln',
        kind: 'payment-send-update',
        payload: {
          operation_id: 'ln-send',
          status: {
            Success: Array.from({ length: 32 }, (_value, index) => index),
          },
        },
        tsUsecs: 1_100_000,
      }),
      createEventLogEntry({
        module: 'mintv2',
        kind: 'payment-send',
        payload: {
          operation_id: 'mint-send',
          amount: 22_000,
          ecash: 'cashu-test',
        },
        tsUsecs: 2_000_000,
      }),
      createEventLogEntry({
        module: 'mint',
        kind: 'payment-receive',
        payload: {
          operation_id: 'mint-receive',
          amount: 33_000,
        },
        tsUsecs: 3_000_000,
      }),
      createEventLogEntry({
        module: 'mint',
        kind: 'payment-receive-update',
        payload: {
          operation_id: 'mint-receive',
          status: 'Success',
        },
        tsUsecs: 3_100_000,
      }),
      createEventLogEntry({
        module: 'wallet',
        kind: 'payment-receive',
        payload: {
          operation_id: 'wallet-receive',
          amount: 44_000,
          txid: 'wallet-receive-txid',
        },
        tsUsecs: 4_000_000,
      }),
      createEventLogEntry({
        module: 'walletv2',
        kind: 'payment-send',
        payload: {
          operation_id: 'wallet-send',
          address: 'bcrt1qsend',
          value: 55,
          fee: 2,
        },
        tsUsecs: 5_000_000,
      }),
      createEventLogEntry({
        module: 'walletv2',
        kind: 'payment-send-update',
        payload: {
          operation_id: 'wallet-send',
          status: {
            Success: 'wallet-send-txid',
          },
        },
        tsUsecs: 5_100_000,
      }),
      createEventLogEntry({
        module: 'walletv2',
        kind: 'payment-receive',
        payload: {
          operation_id: 'walletv2-receive',
          address: 'bcrt1qreceive',
          value: 66,
          fee: 1,
        },
        tsUsecs: 6_000_000,
      }),
      createEventLogEntry({
        module: 'walletv2',
        kind: 'payment-receive-update',
        payload: {
          operation_id: 'walletv2-receive',
          status: 'Success',
        },
        tsUsecs: 6_100_000,
      }),
      createEventLogEntry({
        module: 'lnv2',
        kind: 'unknown-event',
        payload: {
          operation_id: 'ignored',
          amount: 77_000,
        },
        tsUsecs: 7_000_000,
      }),
      createEventLogEntry({
        module: 'lnv2',
        kind: 'payment-receive',
        payload: {
          operation_id: 'missing-amount',
        },
        tsUsecs: 8_000_000,
      }),
    ])
    walletStore.wallet = wallet as never
    walletStore.wasRestoredFromMnemonic = true

    const page = await walletStore.getTransactionsPage(20)

    expect(page.transactions.map((transaction) => transaction.operationId)).toEqual([
      'walletv2-receive',
      'wallet-send',
      'wallet-receive',
      'mint-receive',
      'mint-send',
      'ln-send',
    ])
    expect(
      page.transactions.find((transaction) => transaction.operationId === 'ln-send'),
    ).toMatchObject({
      kind: 'ln',
      type: 'send',
      amountMsats: 11_000,
      fee: 1_000,
      outcome: 'success',
    })
    expect(
      page.transactions.find((transaction) => transaction.operationId === 'mint-send'),
    ).toMatchObject({
      kind: 'mint',
      type: 'spend_oob',
      amountMsats: 22_000,
      notes: 'cashu-test',
    })
    expect(
      page.transactions.find((transaction) => transaction.operationId === 'wallet-send'),
    ).toMatchObject({
      kind: 'wallet',
      type: 'withdraw',
      amountMsats: 55_000,
      fee: 2_000,
      onchainAddress: 'bcrt1qsend',
      txId: 'wallet-send-txid',
    })
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
        ...Array.from({ length: 50 }, (_value, index) => [
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
    expect(wallet.federation.listTransactions).toHaveBeenNthCalledWith(1, 51, undefined)
    expect(wallet.federation.listTransactions).toHaveBeenNthCalledWith(2, 50, firstCursor)
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
