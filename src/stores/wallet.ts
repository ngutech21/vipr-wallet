import { defineStore, acceptHMRUpdate } from 'pinia'
import { type FedimintWallet, WalletDirector, type MSats, type Transactions } from '@fedimint/core'
import { WasmWorkerTransport } from '@fedimint/transport-web'
import { useFederationStore } from './federation'
import { ref } from 'vue'
import type { Federation, FederationMeta, ModuleConfig } from 'src/components/models'
import { logger } from 'src/services/logger'

const WALLET_OPEN_TIMEOUT_MS = 15_000
const FEDERATION_JOIN_TIMEOUT_MS = 20_000
const BALANCE_UPDATE_TIMEOUT_MS = 10_000

export const useWalletStore = defineStore('wallet', {
  state: () => ({
    director: null as WalletDirector | null,
    wallet: null as FedimintWallet | null,
    balance: ref(0),
  }),
  actions: {
    async openWalletForFederation(selectedFederation: Federation) {
      // Ensure director is initialized
      if (this.director == null) {
        this.initDirector()
      }

      // Create wallet if none exists
      if (this.wallet == null && this.director != null) {
        this.wallet = await this.director.createWallet()
      }

      const walletIsOpen = this.wallet?.isOpen()
      if (
        walletIsOpen &&
        (await this.wallet?.federation.getFederationId()) !== selectedFederation.federationId
      ) {
        await this.closeWallet()
        if (this.director != null) {
          this.wallet = await this.director.createWallet()
        }
      }

      if (!this.wallet?.isOpen()) {
        const wallet = this.wallet
        if (wallet == null) {
          throw new Error('Wallet is not initialized')
        }

        const walletOpened = await withTimeout(
          wallet.open(selectedFederation.federationId),
          WALLET_OPEN_TIMEOUT_MS,
          'wallet open',
        )
        if (!walletOpened) {
          logger.logWalletOperation('Joining federation', {
            federationId: selectedFederation.federationId,
          })
          await withTimeout(
            wallet.joinFederation(selectedFederation.inviteCode, selectedFederation.federationId),
            FEDERATION_JOIN_TIMEOUT_MS,
            'federation join',
          )
          logger.logWalletOperation('Federation joined successfully')
        }
      }
      await withTimeout(this.updateBalance(), BALANCE_UPDATE_TIMEOUT_MS, 'balance update')
    },
    initDirector() {
      if (this.director == null) {
        try {
          this.director = new WalletDirector(new WasmWorkerTransport())
          this.director.setLogLevel('debug')
          logger.logWalletOperation('Wallet director initialized')
        } catch (error) {
          logger.error('Failed to initialize wallet director', error)
          throw error
        }
      }
    },
    async openWallet() {
      const federationStore = useFederationStore()
      const selectedFederation = federationStore.selectedFederation

      if (selectedFederation != null) {
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
          this.director = null
          this.initDirector()
          await this.openWalletForFederation(selectedFederation)
        }
      } else {
        this.balance = 0
      }
    },
    async closeWallet() {
      if (this.wallet != null) {
        await this.wallet.cleanup()
        this.wallet = null
      }
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
        return transactions ?? [] // Handle undefined case
      } catch (error) {
        logger.error('Failed to fetch transactions', error)
        return [] // Return empty array on error
      }
    },

    async deleteFederationData(federationId: string): Promise<void> {
      try {
        // Close the wallet first if it's open
        if (this.wallet?.isOpen()) {
          await this.closeWallet()
        }

        // Delete the IndexedDB database
        await new Promise<void>((resolve, reject) => {
          const deleteRequest = indexedDB.deleteDatabase(federationId)

          deleteRequest.onerror = () => {
            reject(new Error(`Failed to delete database ${federationId}`))
          }

          deleteRequest.onsuccess = () => {
            logger.logWalletOperation('Federation database deleted successfully')
            resolve()
          }
        })
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
      const result = await this.director?.previewFederation(inviteCode)
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
      const modules = config?.modules ?? {}

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
