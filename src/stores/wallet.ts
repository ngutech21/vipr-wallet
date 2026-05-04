import { defineStore, acceptHMRUpdate } from 'pinia'
import type {
  FedimintWallet,
  ParsedNoteDetails,
  JSONValue,
  JSONObject,
  MetaConsensusValue,
  MSats,
  OperationKey,
  OperationLog,
  SpendNotesState,
  NoteCountByDenomination,
  Transactions,
  TxOutputSummary,
  WalletTransaction,
  WalletVariant,
} from '@fedimint/core'
import { useFederationStore } from './federation'
import type {
  Federation,
  FederationGuardian,
  FederationMeta,
  ModuleConfig,
  FederationUtxo,
} from 'src/types/federation'
import { logger } from 'src/services/logger'
import { fedimintClient } from 'src/services/fedimint-client'
import { getErrorMessage } from 'src/utils/error'
import {
  extractExternalMetadataPayload,
  getFederationTitleFallback,
  resolveFederationMetadata,
} from 'src/services/federation-metadata'
import { federationHasModule } from 'src/utils/federationModules'

const WALLET_NAME_PREFIX = 'wallet-'

let walletOpenQueue: Promise<void> | null = null

export const FEDIMINT_STORAGE_SCHEMA_KEY = 'vipr.fedimint.storage.schema'
export const FEDIMINT_STORAGE_SCHEMA_VERSION = '2'
export const FEDIMINT_MNEMONIC_BACKUP_CONFIRMED_KEY = 'vipr.fedimint.mnemonic.backup.confirmed'

export function getWalletNameForFederationId(federationId: string): string {
  return `${WALLET_NAME_PREFIX}${federationId}`
}

export type EcashInspection = {
  amountMsats: number
  amountSats: number
  parsed: ParsedNoteDetails
  matchedFederation: Federation | null
  inviteCode: string | null
  requiresJoin: boolean
}

export type OfflineEcashSpendResult = {
  notes: string
  operationId: string
}

export type SendOnchainResult = {
  operationId: string
}

export type TransactionsPageResult = {
  transactions: Transactions[]
  nextCursor: OperationKey | null
  hasMore: boolean
}

export type TransactionsPageOptions = {
  visibleOnly?: boolean
}

type TransactionsBatchEntry = {
  transaction: Transactions
  operationKey: OperationKey | null
}

type TransactionsBatchResult = {
  entries: TransactionsBatchEntry[]
  nextCursor: OperationKey | null
  hasMore: boolean
}

type TransactionHistoryWallet = {
  federation: {
    listTransactions: (limit?: number, lastSeen?: OperationKey) => Promise<Transactions[]>
    listOperations: (
      limit?: number,
      lastSeen?: OperationKey,
    ) => Promise<Array<[OperationKey, OperationLog]>>
  }
}

export const useWalletStore = defineStore('wallet', {
  state: () => ({
    wallet: null as FedimintWallet | null,
    activeWalletName: null as string | null,
    balance: 0,
    mnemonicWords: [] as string[],
    hasMnemonic: false,
    needsMnemonicBackup: false,
  }),
  actions: {
    async initClients() {
      await fedimintClient.init()
      fedimintClient.setLogLevel('debug')
    },

    async ensureStorageSchema() {
      const currentSchema = localStorage.getItem(FEDIMINT_STORAGE_SCHEMA_KEY)
      if (currentSchema === FEDIMINT_STORAGE_SCHEMA_VERSION) {
        return false
      }

      logger.logWalletOperation('Applying Fedimint storage migration', {
        from: currentSchema ?? 'none',
        to: FEDIMINT_STORAGE_SCHEMA_VERSION,
      })

      await this.initClients()
      await this.clearAllWallets()

      const federationStore = useFederationStore()
      federationStore.federations = []
      federationStore.selectedFederationId = null
      localStorage.setItem(FEDIMINT_MNEMONIC_BACKUP_CONFIRMED_KEY, '0')

      localStorage.setItem(FEDIMINT_STORAGE_SCHEMA_KEY, FEDIMINT_STORAGE_SCHEMA_VERSION)
      logger.logWalletOperation('Fedimint storage migration applied', {
        schema: FEDIMINT_STORAGE_SCHEMA_VERSION,
      })

      return true
    },

    async openWalletForFederation(selectedFederation: Federation) {
      await this.initClients()
      if (!this.hasMnemonic) {
        const hasMnemonic = await this.loadMnemonic()
        if (!hasMnemonic) {
          throw new Error('Wallet mnemonic is not initialized')
        }
      }

      const walletName = getWalletNameForFederationId(selectedFederation.federationId)
      if (this.activeWalletName != null && this.activeWalletName !== walletName) {
        await this.closeWallet()
      }

      this.wallet = await fedimintClient.ensureWalletOpen({
        walletName,
        federationId: selectedFederation.federationId,
        inviteCode: selectedFederation.inviteCode,
      })

      this.activeWalletName = walletName
      await this.updateBalance()
      await this.refreshFederationMetadata(selectedFederation)
    },

    async openWallet() {
      const previousOpen = walletOpenQueue
      const openAttempt =
        previousOpen == null
          ? this.openWalletOnce()
          : previousOpen.catch(() => undefined).then(() => this.openWalletOnce())

      walletOpenQueue = openAttempt

      try {
        await openAttempt
      } finally {
        if (walletOpenQueue === openAttempt) {
          walletOpenQueue = null
        }
      }
    },

    async openWalletOnce() {
      const federationStore = useFederationStore()
      const selectedFederation = federationStore.selectedFederation

      if (selectedFederation == null) {
        this.wallet = null
        this.activeWalletName = null
        this.balance = 0
        return
      }

      logger.logWalletOperation('Opening wallet for federation', {
        federationId: selectedFederation.federationId,
      })

      try {
        await this.openWalletForFederation(selectedFederation)
      } catch (error) {
        if (!isRecoverableTransportError(error)) {
          throw error
        }

        logger.warn('Wallet transport entered an invalid RPC state; retrying open', {
          federationId: selectedFederation.federationId,
          reason: getErrorMessage(error),
        })

        await this.closeWallet()
        fedimintClient.reset()
        await this.openWalletForFederation(selectedFederation)
      }
    },

    async closeWallet() {
      try {
        await fedimintClient.closeActiveWallet()
      } finally {
        this.wallet = null
        this.activeWalletName = null
      }
    },

    async clearAllWallets() {
      await this.initClients()
      await fedimintClient.clearAllWallets()
      this.wallet = null
      this.activeWalletName = null
      this.balance = 0
      this.mnemonicWords = []
      this.hasMnemonic = false
      this.needsMnemonicBackup = false
    },

    async listWallets(): Promise<string[]> {
      await this.initClients()
      return await fedimintClient.listWallets()
    },

    async loadMnemonic(): Promise<boolean> {
      await this.initClients()
      const words = await fedimintClient.getMnemonicIfSet()
      if (words == null) {
        this.mnemonicWords = []
        this.hasMnemonic = false
        this.needsMnemonicBackup = false
        return false
      }

      this.mnemonicWords = words
      this.hasMnemonic = true
      this.needsMnemonicBackup =
        localStorage.getItem(FEDIMINT_MNEMONIC_BACKUP_CONFIRMED_KEY) !== '1'
      return true
    },

    async createMnemonic(): Promise<void> {
      await this.initClients()
      const words = await fedimintClient.generateMnemonic()
      this.mnemonicWords = words
      this.hasMnemonic = true
      localStorage.setItem(FEDIMINT_MNEMONIC_BACKUP_CONFIRMED_KEY, '0')
      this.needsMnemonicBackup = true
    },

    async restoreMnemonic(words: string[]): Promise<void> {
      await this.initClients()
      await fedimintClient.setMnemonic(words)
      const hasMnemonic = await this.loadMnemonic()
      if (!hasMnemonic) {
        throw new Error('Failed to verify restored mnemonic')
      }
      localStorage.setItem(FEDIMINT_MNEMONIC_BACKUP_CONFIRMED_KEY, '1')
      this.needsMnemonicBackup = false
    },

    markMnemonicBackupConfirmed() {
      localStorage.setItem(FEDIMINT_MNEMONIC_BACKUP_CONFIRMED_KEY, '1')
      this.needsMnemonicBackup = false
    },

    async inspectEcash(tokens: string): Promise<EcashInspection> {
      const parsed = await fedimintClient.parseOobNotes(tokens)
      const federationStore = useFederationStore()
      const federationId = parsed.federation_id?.trim() ?? ''
      if (federationId === '') {
        throw new Error('Ecash notes do not include a federation id')
      }
      const matchedFederation =
        federationStore.federations.find(
          (federation) => federation.federationId === federationId,
        ) ?? null
      const trimmedInviteCode = parsed.invite_code?.trim() ?? ''
      const inviteCode = trimmedInviteCode !== '' ? trimmedInviteCode : null
      const amountMsats = parsed.total_amount

      return {
        amountMsats,
        amountSats: Math.floor(amountMsats / 1_000),
        parsed,
        matchedFederation,
        inviteCode,
        requiresJoin: matchedFederation == null,
      }
    },

    async redeemEcash(tokens: string): Promise<MSats | undefined> {
      if (this.wallet == null) {
        throw new Error('Wallet is not open')
      }

      const amount = await this.wallet.mint.parseNotes(tokens)
      const opsId = await this.wallet.mint.reissueExternalNotes(tokens)
      if (opsId != null && opsId !== '') {
        this.wallet.mint.subscribeReissueExternalNotes(opsId, (_state) => {
          this.updateBalance()
            .then(() => logger.logWalletOperation('Balance updated after ecash redemption'))
            .catch((err) => logger.error('Error updating balance after ecash redemption', err))
        })
      }
      return amount
    },

    async spendEcashOffline(amountSats: number): Promise<OfflineEcashSpendResult> {
      if (this.wallet == null) {
        throw new Error('Wallet is not initialized')
      }

      if (!Number.isInteger(amountSats) || amountSats <= 0) {
        throw new Error('Amount must be a positive whole number of sats')
      }

      logger.logTransaction('Creating offline eCash spend', { amount: amountSats })

      const result = await this.wallet.mint.spendNotes(amountSats * 1_000, 86_400, false)
      const operationId = result.operation_id
      const notes = result.notes

      if (operationId == null || operationId === '' || notes == null || notes === '') {
        throw new Error('Failed to create offline eCash notes')
      }

      try {
        await this.updateBalance()
      } catch (error) {
        logger.error('Failed to update balance after creating offline eCash', {
          operationId,
          error,
        })
      }

      let unsubscribe = () => {}
      const refreshBalanceAfterSpendState = (state: SpendNotesState) => {
        if (
          state === 'Success' ||
          state === 'Refunded' ||
          state === 'UserCanceledFailure' ||
          state === 'UserCanceledSuccess'
        ) {
          unsubscribe()
          this.updateBalance()
            .then(() =>
              logger.logWalletOperation('Balance updated after offline eCash state change', {
                operationId,
                state,
              }),
            )
            .catch((error) =>
              logger.error('Failed to update balance after offline eCash state change', error),
            )
        }
      }

      unsubscribe = this.wallet.mint.subscribeSpendNotes(
        operationId,
        refreshBalanceAfterSpendState,
        (error) => {
          unsubscribe()
          logger.error('Offline eCash spend subscription failed', { operationId, error })
        },
      )

      return {
        notes,
        operationId,
      }
    },

    async getOfflineEcashNoteCounts(): Promise<NoteCountByDenomination> {
      if (this.wallet == null) {
        throw new Error('Wallet is not initialized')
      }

      return await this.wallet.mint.getNotesByDenomination()
    },

    async sendOnchain(
      address: string,
      amountSats: number,
      extraMeta: JSONValue = {},
    ): Promise<SendOnchainResult> {
      if (this.wallet == null) {
        throw new Error('Wallet is not initialized')
      }

      const normalizedAddress = address.trim()

      if (normalizedAddress === '') {
        throw new Error('Bitcoin address is required')
      }

      if (!Number.isInteger(amountSats) || amountSats <= 0) {
        throw new Error('Amount must be a positive whole number of sats')
      }

      logger.logTransaction('Creating onchain withdrawal', {
        amount: amountSats,
        address: normalizedAddress,
      })

      const result = await this.wallet.wallet.sendOnchain(amountSats, normalizedAddress, extraMeta)
      const operationId = result?.operation_id

      if (operationId == null || operationId === '') {
        throw new Error('Failed to submit onchain withdrawal')
      }

      try {
        await this.updateBalance()
      } catch (error) {
        logger.error('Failed to refresh balance after onchain withdrawal submission', {
          operationId,
          error,
        })
      }

      return {
        operationId,
      }
    },

    async getTransactions(): Promise<Transactions[]> {
      try {
        if (this.wallet == null) {
          return []
        }

        const transactions = await this.wallet.federation.listTransactions(10)
        const operations = await this.wallet.federation.listOperations(10).catch((error) => {
          logger.warn('Failed to fetch operation metadata for transaction enrichment', error)
          return []
        })

        const operationLogById = new Map<string, OperationLog>()
        for (const operation of operations) {
          if (!Array.isArray(operation) || operation.length !== 2) {
            continue
          }

          const [operationKey, operationLog] = operation
          operationLogById.set(operationKey.operation_id, operationLog)
        }

        return (transactions ?? []).map((transaction) =>
          normalizeTransaction(transaction, operationLogById.get(transaction.operationId)),
        )
      } catch (error) {
        logger.error('Failed to fetch transactions', error)
        return []
      }
    },

    async getTransactionsPage(
      pageSize = 10,
      lastSeen?: OperationKey,
      options: TransactionsPageOptions = {},
    ): Promise<TransactionsPageResult> {
      if (this.wallet == null) {
        return {
          transactions: [],
          nextCursor: null,
          hasMore: false,
        }
      }

      if (!Number.isInteger(pageSize) || pageSize <= 0) {
        return {
          transactions: [],
          nextCursor: lastSeen ?? null,
          hasMore: false,
        }
      }

      try {
        const collected: TransactionsBatchEntry[] = []
        const visibleLimit = pageSize + 1
        let cursor = lastSeen
        const visibleOnly = options.visibleOnly === true

        while (collected.length < visibleLimit) {
          const remaining = visibleLimit - collected.length
          // Cursor pagination is sequential because each request depends on the previous page.
          // eslint-disable-next-line no-await-in-loop
          const batch = await fetchTransactionsBatch(this.wallet, remaining, cursor)

          collected.push(
            ...(visibleOnly
              ? batch.entries.filter((entry) => isVisibleTransactionInList(entry.transaction))
              : batch.entries),
          )

          if (batch.nextCursor == null || !batch.hasMore) {
            const visibleEntries = collected.slice(0, pageSize)
            const hasMore = collected.length > pageSize
            return {
              transactions: visibleEntries.map((entry) => entry.transaction),
              nextCursor: hasMore ? (visibleEntries.at(-1)?.operationKey ?? null) : null,
              hasMore,
            }
          }

          cursor = batch.nextCursor
        }

        const visibleEntries = collected.slice(0, pageSize)

        return {
          transactions: visibleEntries.map((entry) => entry.transaction),
          nextCursor: visibleEntries.at(-1)?.operationKey ?? null,
          hasMore: true,
        }
      } catch (error) {
        logger.error('Failed to fetch paged transactions', error)
        throw error
      }
    },

    async getTransactionByOperationId(operationId: string): Promise<Transactions | null> {
      if (this.wallet == null || operationId.trim() === '') {
        return null
      }

      let cursor: OperationKey | undefined

      while (true) {
        // Cursor pagination is sequential because each request depends on the previous page.
        // eslint-disable-next-line no-await-in-loop
        const page = await this.getTransactionsPage(50, cursor)
        const transaction = page.transactions.find((entry) => entry.operationId === operationId)

        if (transaction != null) {
          return transaction
        }

        if (!page.hasMore || page.nextCursor == null) {
          return null
        }

        cursor = page.nextCursor
      }
    },

    async deleteFederationData(federationId: string): Promise<void> {
      const walletName = getWalletNameForFederationId(federationId)
      try {
        if (this.activeWalletName === walletName) {
          await this.closeWallet()
        }

        await this.initClients()
        await fedimintClient.deleteWallet(walletName)
        logger.logWalletOperation('Federation wallet deleted successfully', { federationId })
      } catch (error) {
        logger.error('Failed to delete federation data', error)
        throw error
      }
    },

    async handleFederationChange() {
      await this.openWallet()
    },

    async updateBalance() {
      if (this.wallet != null) {
        this.balance = ((await this.wallet.balance.getBalance()) ?? 0) / 1_000
      } else {
        this.balance = 0
      }
    },

    async getSpendableUtxos(): Promise<FederationUtxo[]> {
      if (this.wallet == null) {
        return []
      }

      try {
        const summary = await this.wallet.wallet.getWalletSummary()
        return summary.spendable_utxos
          .map(mapTxOutputSummaryToFederationUtxo)
          .sort((left, right) => right.amount - left.amount)
      } catch (error) {
        logger.error('Failed to fetch spendable UTXOs', error)
        throw error
      }
    },

    async getMetadata(federation: Federation): Promise<FederationMeta | undefined> {
      if (federation.metaUrl == null || federation.metaUrl === '') {
        logger.warn('No metaUrl provided for federation')
        return undefined
      }
      try {
        const metadata = await fetchExternalFederationMetadata(federation.metaUrl)
        logger.logFederation('Fetching federation metadata', undefined)
        logger.logFederation('Metadata fetched successfully')
        return resolveFederationMetadata({
          legacy: metadata,
          includeRawSources: isMetadataDebugEnabled(),
        })
      } catch (error) {
        logger.error('Failed to fetch federation metadata', error)
        return undefined
      }
    },

    async getMetaConsensusValue(key?: number): Promise<MetaConsensusValue<JSONObject> | null> {
      if (this.wallet == null) {
        throw new Error('Wallet is not open')
      }

      return await this.wallet.federation.getMetaConsensusValue<JSONObject>(key)
    },

    async refreshFederationMetadata(federation: Federation): Promise<void> {
      const federationStore = useFederationStore()
      let metaModule: MetaConsensusValue<JSONObject> | null = null

      if (this.wallet == null) {
        return
      }

      if (federationHasModule(federation, 'meta')) {
        try {
          metaModule = await this.getMetaConsensusValue()
        } catch (error) {
          logger.warn('Failed to load federation meta module data; keeping legacy metadata', {
            federationId: federation.federationId,
            error,
          })
        }
      }

      const metadata = resolveFederationMetadata({
        config: { federation_name: federation.title },
        legacy: federation.metadata ?? null,
        metaModule,
        includeRawSources: isMetadataDebugEnabled(),
      })

      federationStore.updateFederationMetadata(federation.federationId, metadata)
    },

    async previewFederation(inviteCode: string): Promise<Federation | undefined> {
      await this.initClients()

      const result = await fedimintClient.previewFederation(inviteCode)
      if (result == null) {
        return undefined
      }

      const { config, federation_id } = result
      logger.logFederation('Federation preview successful', federation_id)

      const typedConfig = config as {
        global?: {
          api_endpoints?: Record<
            string,
            {
              name?: string
              url?: string
            }
          >
          meta?: {
            federation_name?: string
            meta_external_url?: string
          }
        }
        modules?: Record<string, unknown>
      }

      const federationName = typedConfig?.global?.meta?.federation_name ?? 'Unknown Federation'
      const guardians = extractFederationGuardians(typedConfig?.global?.api_endpoints)
      const metaExternalUrl = typedConfig?.global?.meta?.meta_external_url as string
      const modules = typedConfig?.modules ?? {}

      let legacyMetadata: JSONObject | null = null

      if (metaExternalUrl != null && metaExternalUrl !== '') {
        try {
          legacyMetadata = await fetchExternalFederationMetadata(metaExternalUrl)
          logger.logFederation('External metadata fetched')
          logger.logFederation('External metadata parsed')
        } catch (error) {
          logger.warn('Failed to fetch external metadata, continuing without metadata', error)
        }
      }

      const metadata = resolveFederationMetadata({
        config: typedConfig?.global?.meta ?? null,
        legacy: legacyMetadata,
        includeRawSources: isMetadataDebugEnabled(),
      })
      const title = getFederationTitleFallback(metadata, federationName)

      return {
        title,
        inviteCode: inviteCode,
        federationId: federation_id.trim(),
        metaUrl: metaExternalUrl,
        modules: Object.values(modules) as ModuleConfig[],
        guardians,
        metadata,
      } satisfies Federation
    },
  },
})

async function fetchExternalFederationMetadata(url: string): Promise<JSONObject | null> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return extractExternalMetadataPayload(await response.json())
}

function isMetadataDebugEnabled(): boolean {
  return import.meta.env.DEV || import.meta.env.VITE_E2E_MODE === '1'
}

async function fetchTransactionsBatch(
  wallet: TransactionHistoryWallet,
  limit: number,
  lastSeen?: OperationKey,
): Promise<TransactionsBatchResult> {
  const transactions = await wallet.federation.listTransactions(limit, lastSeen)
  const operations = await wallet.federation.listOperations(limit, lastSeen).catch((error) => {
    logger.warn('Failed to fetch operation metadata for paged transaction enrichment', error)
    return []
  })

  const operationLogById = new Map<string, OperationLog>()
  const operationKeyById = new Map<string, OperationKey>()
  for (const operation of operations) {
    if (!Array.isArray(operation) || operation.length !== 2) {
      continue
    }

    const [operationKey, operationLog] = operation
    operationLogById.set(operationKey.operation_id, operationLog)
    operationKeyById.set(operationKey.operation_id, operationKey)
  }

  const nextCursor = operations.at(-1)?.[0] ?? null

  return {
    entries: (transactions ?? []).map((transaction) => ({
      transaction: normalizeTransaction(transaction, operationLogById.get(transaction.operationId)),
      operationKey: operationKeyById.get(transaction.operationId) ?? null,
    })),
    nextCursor,
    hasMore: operations.length === limit && nextCursor != null,
  }
}

function extractFederationGuardians(
  apiEndpoints:
    | Record<
        string,
        {
          name?: string
          url?: string
        }
      >
    | undefined,
): FederationGuardian[] {
  if (apiEndpoints == null) {
    return []
  }

  return Object.entries(apiEndpoints)
    .map(([peerId, peer]) => {
      const numericPeerId = Number.parseInt(peerId, 10)
      const normalizedPeerId = Number.isNaN(numericPeerId) ? 0 : numericPeerId

      return {
        peerId: normalizedPeerId,
        name: typeof peer?.name === 'string' ? peer.name.trim() : '',
        url: typeof peer?.url === 'string' ? peer.url.trim() : '',
      } satisfies FederationGuardian
    })
    .filter((guardian) => guardian.url !== '')
    .sort((left, right) => left.peerId - right.peerId)
}

function normalizeTransaction(
  transaction: Transactions,
  operationLog: OperationLog | undefined,
): Transactions {
  if (transaction.kind !== 'wallet') {
    return transaction
  }

  return normalizeWalletTransaction(transaction as WalletTransaction, operationLog)
}

function normalizeWalletTransaction(
  transaction: WalletTransaction,
  operationLog: OperationLog | undefined,
): WalletTransaction {
  if (operationLog == null) {
    return transaction
  }

  const variant = operationLog.meta?.variant as WalletVariant | undefined
  const metaAmount = operationLog.meta?.amount
  const variantAmount = getWalletWithdrawAmountMsats(variant?.withdraw)
  const depositAmount = getWalletDepositAmountMsats(operationLog)
  const extraMetaAmount = getRequestedWalletAmountMsats(operationLog.meta?.extra_meta)
  const normalizedAmountMsats =
    transaction.amountMsats > 0
      ? transaction.amountMsats
      : typeof variantAmount === 'number' && Number.isFinite(variantAmount) && variantAmount > 0
        ? variantAmount
        : depositAmount != null && depositAmount > 0
          ? depositAmount
          : extraMetaAmount != null && extraMetaAmount > 0
            ? extraMetaAmount
            : typeof metaAmount === 'number' && Number.isFinite(metaAmount) && metaAmount > 0
              ? metaAmount
              : 0

  const feeEstimateMsats = estimateWalletFeeMsats(variant)

  return {
    ...transaction,
    amountMsats: normalizedAmountMsats,
    fee: feeEstimateMsats ?? transaction.fee,
  }
}

function isVisibleTransactionInList(transaction: Transactions): boolean {
  return transaction.kind === 'ln' || transaction.kind === 'mint' || transaction.kind === 'wallet'
}

function estimateWalletFeeMsats(variant: WalletVariant | undefined): number | undefined {
  const withdrawFee = variant?.withdraw?.fee
  const satsPerKvb = withdrawFee?.fee_rate?.sats_per_kvb
  const totalWeight = withdrawFee?.total_weight

  if (
    satsPerKvb == null ||
    totalWeight == null ||
    !Number.isFinite(satsPerKvb) ||
    !Number.isFinite(totalWeight) ||
    satsPerKvb <= 0 ||
    totalWeight <= 0
  ) {
    return undefined
  }

  // `sats_per_kvb` is sats per 1000 vbytes; `total_weight` is weight units.
  const feeSats = Math.ceil((satsPerKvb * totalWeight) / 4_000)
  return feeSats * 1_000
}

function getWalletWithdrawAmountMsats(
  withdraw: WalletVariant['withdraw'] | undefined,
): number | undefined {
  if (withdraw == null) {
    return undefined
  }

  const directAmountMsats = getFiniteNumber(
    (withdraw as WalletVariant['withdraw'] & { amount_msats?: JSONValue }).amountMsats ??
      (withdraw as WalletVariant['withdraw'] & { amount_msats?: JSONValue }).amount_msats,
  )

  if (directAmountMsats != null && directAmountMsats > 0) {
    return directAmountMsats
  }

  const rawAmount = (withdraw as WalletVariant['withdraw'] & { amount?: JSONValue }).amount

  if (rawAmount == null) {
    return undefined
  }

  if (typeof rawAmount === 'number' || typeof rawAmount === 'string') {
    const amountSats = getFiniteNumber(rawAmount)
    return amountSats != null && amountSats > 0 ? amountSats * 1_000 : undefined
  }

  if (typeof rawAmount !== 'object' || Array.isArray(rawAmount)) {
    return undefined
  }

  const amountObject = rawAmount
  const nestedAmountMsats = getFiniteNumber(
    amountObject.msats ??
      amountObject.amountMsats ??
      amountObject.amount_msats ??
      amountObject.milli_sats,
  )

  if (nestedAmountMsats != null && nestedAmountMsats > 0) {
    return nestedAmountMsats
  }

  const nestedAmountSats = getFiniteNumber(
    amountObject.sats ?? amountObject.sat ?? amountObject.amountSats ?? amountObject.amount_sats,
  )

  if (nestedAmountSats != null && nestedAmountSats > 0) {
    return nestedAmountSats * 1_000
  }

  return undefined
}

function getWalletDepositAmountMsats(operationLog: OperationLog | undefined): number | undefined {
  const outcome = operationLog?.outcome?.outcome

  if (typeof outcome !== 'object' || outcome == null || Array.isArray(outcome)) {
    return undefined
  }

  const depositOutcome =
    'Claimed' in outcome
      ? outcome.Claimed
      : 'Confirmed' in outcome
        ? outcome.Confirmed
        : 'WaitingForConfirmation' in outcome
          ? outcome.WaitingForConfirmation
          : undefined

  if (typeof depositOutcome !== 'object' || depositOutcome == null) {
    return undefined
  }

  const amountSats = getFiniteNumber(
    (depositOutcome as { btc_deposited?: JSONValue; btcDeposited?: JSONValue }).btc_deposited ??
      (depositOutcome as { btc_deposited?: JSONValue; btcDeposited?: JSONValue }).btcDeposited,
  )

  return amountSats != null && amountSats > 0 ? amountSats * 1_000 : undefined
}

function getRequestedWalletAmountMsats(extraMeta: JSONObject | undefined): number | undefined {
  if (extraMeta == null) {
    return undefined
  }

  const requestedAmountMsats = getFiniteNumber(
    extraMeta.requestedAmountMsats ?? extraMeta.requested_amount_msats,
  )

  if (requestedAmountMsats != null && requestedAmountMsats > 0) {
    return requestedAmountMsats
  }

  const requestedAmountSats = getFiniteNumber(
    extraMeta.requestedAmountSats ?? extraMeta.requested_amount_sats,
  )

  if (requestedAmountSats != null && requestedAmountSats > 0) {
    return requestedAmountSats * 1_000
  }

  return undefined
}

function getFiniteNumber(value: JSONValue | undefined): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsedValue = Number(value)
    return Number.isFinite(parsedValue) ? parsedValue : undefined
  }

  return undefined
}

export function mapTxOutputSummaryToFederationUtxo(output: TxOutputSummary): FederationUtxo {
  const rawOutput = output as TxOutputSummary & {
    outpoint?: string | { txid?: string; vout?: number }
    out_point?: string | { txid?: string; vout?: number }
  }
  const outpoint = rawOutput.outpoint ?? rawOutput.out_point
  const { txid, vout } = parseOutpoint(outpoint)

  return {
    txid,
    vout,
    amount: output.amount,
  }
}

export function parseOutpoint(outpoint: string | { txid?: string; vout?: number } | undefined): {
  txid: string
  vout: number
} {
  if (typeof outpoint === 'string') {
    const [txid = '', rawVout = '0'] = outpoint.trim().split(':')
    const vout = Number.parseInt(rawVout, 10)

    return {
      txid: txid.toLowerCase(),
      vout: Number.isNaN(vout) ? 0 : vout,
    }
  }

  if (outpoint != null) {
    return {
      txid: outpoint.txid?.trim().toLowerCase() ?? '',
      vout: outpoint.vout ?? 0,
    }
  }

  return {
    txid: '',
    vout: 0,
  }
}

function isRecoverableTransportError(error: unknown): boolean {
  return /(rpc is not a function|unreachable executed|closure invoked recursively|after being dropped)/i.test(
    getErrorMessage(error),
  )
}

if (import.meta.hot != null) {
  import.meta.hot.accept(acceptHMRUpdate(useWalletStore, import.meta.hot))
}
