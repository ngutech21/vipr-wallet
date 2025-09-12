import { defineStore, acceptHMRUpdate } from 'pinia'
import { FedimintWallet, type MSats, type Transactions } from '@fedimint/core-web'
import { useFederationStore } from './federation'
import { ref } from 'vue'
import type { Federation, FederationMeta, ModuleConfig } from 'src/components/models'
import { logger } from 'src/services/logger'

export const useWalletStore = defineStore('wallet', {
  state: () => ({
    wallet: null as FedimintWallet | null,
    balance: ref(0),
  }),
  actions: {
    initWallet() {
      if (this.wallet == null) {
        this.wallet = new FedimintWallet()
      }
    },
    async openWallet() {
      const federationStore = useFederationStore()
      const selectedFederation = federationStore.selectedFederation

      if (selectedFederation != null) {
        logger.logWalletOperation('Opening wallet for federation', {
          federationId: selectedFederation.federationId,
        })

        const walletIsOpen = this.wallet?.isOpen()
        if (
          walletIsOpen &&
          (await this.wallet?.federation.getFederationId()) !== selectedFederation.federationId
        ) {
          await this.closeWallet()
          this.wallet = new FedimintWallet()
        }

        if (!this.wallet?.isOpen()) {
          const walletOpened = await this.wallet?.open(selectedFederation.federationId)
          if (!walletOpened) {
            logger.logWalletOperation('Joining federation', {
              federationId: selectedFederation.federationId,
            })
            await this.wallet?.joinFederation(
              selectedFederation.inviteCode,
              selectedFederation.federationId,
            )
            logger.logWalletOperation('Federation joined successfully')
          }
        }
        await this.updateBalance()
      } else {
        this.balance = 0
      }
      // Update balance after opening the wallet
    },
    async closeWallet() {
      await this.wallet?.cleanup()
      this.wallet = null
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
      const result = await this.wallet?.previewFederation(inviteCode)
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
          logger.error('Failed to fetch external metadata', error)
          return undefined
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
if (import.meta.hot != null) {
  import.meta.hot.accept(acceptHMRUpdate(useWalletStore, import.meta.hot))
}
