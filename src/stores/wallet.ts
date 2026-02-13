import { defineStore, acceptHMRUpdate } from 'pinia'
import type { FedimintWallet, MSats, Transactions } from '@fedimint/core'
import { useFederationStore } from './federation'
import type { Federation, FederationMeta, ModuleConfig } from 'src/components/models'
import { logger } from 'src/services/logger'
import { fedimintClient } from 'src/services/fedimint-client'

const WALLET_OPEN_TIMEOUT_MS = 15_000
const FEDERATION_JOIN_TIMEOUT_MS = 20_000
const BALANCE_UPDATE_TIMEOUT_MS = 10_000
const WALLET_NAME_PREFIX = 'wallet-'

export const FEDIMINT_STORAGE_SCHEMA_KEY = 'vipr.fedimint.storage.schema'
export const FEDIMINT_STORAGE_SCHEMA_VERSION = '2'
export const FEDIMINT_MNEMONIC_BACKUP_CONFIRMED_KEY = 'vipr.fedimint.mnemonic.backup.confirmed'

export function getWalletNameForFederationId(federationId: string): string {
  return `${WALLET_NAME_PREFIX}${federationId}`
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

      this.wallet = await withTimeout(
        fedimintClient.ensureWalletOpen({
          walletName,
          federationId: selectedFederation.federationId,
          inviteCode: selectedFederation.inviteCode,
        }),
        WALLET_OPEN_TIMEOUT_MS + FEDERATION_JOIN_TIMEOUT_MS,
        'wallet open',
      )

      this.activeWalletName = walletName
      await withTimeout(this.updateBalance(), BALANCE_UPDATE_TIMEOUT_MS, 'balance update')
    },

    async openWallet() {
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
        if (!isRecoverableTransportError(error) && !isTimeoutError(error)) {
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

    async redeemEcash(tokens: string): Promise<MSats | undefined> {
      const amount = await this.wallet?.mint.parseNotes(tokens)
      const opsId = await this.wallet?.mint.reissueExternalNotes(tokens)
      if (opsId != null && opsId !== '') {
        this.wallet?.mint.subscribeReissueExternalNotes(opsId, (_state) => {
          this.updateBalance()
            .then(() => logger.logWalletOperation('Balance updated after ecash redemption'))
            .catch((err) => logger.error('Error updating balance after ecash redemption', err))
        })
      }
      return amount
    },

    async getTransactions(): Promise<Transactions[]> {
      try {
        const transactions = await this.wallet?.federation.listTransactions(10)
        return transactions ?? []
      } catch (error) {
        logger.error('Failed to fetch transactions', error)
        return []
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

    async getMetadata(federation: Federation): Promise<FederationMeta | undefined> {
      if (federation.metaUrl == null || federation.metaUrl === '') {
        logger.warn('No metaUrl provided for federation')
        return undefined
      }
      try {
        const response = await fetch(federation.metaUrl)
        logger.logFederation('Fetching federation metadata', undefined)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        logger.logFederation('Metadata fetched successfully')
        const metadata = Object.values(data)[0] as FederationMeta
        return metadata
      } catch (error) {
        logger.error('Failed to fetch federation metadata', error)
        return undefined
      }
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
          meta?: {
            federation_name?: string
            meta_external_url?: string
          }
        }
        modules?: Record<string, unknown>
      }

      const federationName = typedConfig?.global?.meta?.federation_name ?? 'Unknown Federation'

      const metaExternalUrl = typedConfig?.global?.meta?.meta_external_url as string
      const modules = typedConfig?.modules ?? {}

      let meta: FederationMeta

      if (metaExternalUrl != null && metaExternalUrl !== '') {
        try {
          const response = await fetch(metaExternalUrl)

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          const data = await response.json()
          logger.logFederation('External metadata fetched')
          meta = Object.values(data)[0] as FederationMeta
          logger.logFederation('External metadata parsed')
        } catch (error) {
          logger.warn('Failed to fetch external metadata, continuing without metadata', error)
          meta = {}
        }
      } else {
        meta = {}
      }

      return {
        title: federationName,
        inviteCode: inviteCode,
        federationId: federation_id.trim(),
        metaUrl: metaExternalUrl,
        modules: Object.values(modules) as ModuleConfig[],
        metadata: meta,
      } satisfies Federation
    },
  },
})

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }

  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

function isRecoverableTransportError(error: unknown): boolean {
  return /(rpc is not a function|unreachable executed|closure invoked recursively|after being dropped)/i.test(
    getErrorMessage(error),
  )
}

function isTimeoutError(error: unknown): boolean {
  return /timed out/i.test(getErrorMessage(error))
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId != null) {
      clearTimeout(timeoutId)
    }
  }
}

if (import.meta.hot != null) {
  import.meta.hot.accept(acceptHMRUpdate(useWalletStore, import.meta.hot))
}
