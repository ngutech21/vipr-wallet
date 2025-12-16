import { defineStore, acceptHMRUpdate } from 'pinia'
import { type FedimintWallet, WalletDirector, type MSats, type Transactions } from '@fedimint/core'
import { WasmWorkerTransport } from '@fedimint/transport-web'
import { useFederationStore } from './federation'
import { ref } from 'vue'
import type { Federation, FederationMeta, ModuleConfig } from 'src/components/models'
import { logger } from 'src/services/logger'
import { Notify } from 'quasar'


export const useWalletStore = defineStore('wallet', {
  state: () => ({
    director: null as WalletDirector | null,
    wallet: null as FedimintWallet | null,
    balance: ref(0),
  }),
  actions: {
    async initDirector() {
      if (this.director == null) {
        try {
          this.director = new WalletDirector(new WasmWorkerTransport())
          this.director.setLogLevel('debug')
          logger.logWalletOperation('Wallet director initialized')
        } catch (error) {
          logger.error('Failed to initialize wallet director', error)
          throw error
        }

        await new Promise<void>((resolve) => {
          setTimeout(() => resolve(), 500)
        })
        if (this.wallet == null) {
          logger.logWalletOperation('open wallet')
          this.wallet = await this.director.createWallet()
          await this.wallet.open()
        }

        const oldMnemonic = await this.director?.getMnemonic()
        logger.logWalletOperation(`Checking for existing mnemonic: ${oldMnemonic?.toString()}`)
        if (oldMnemonic == null || oldMnemonic == undefined) {
          const mnemonic = await this.director?.generateMnemonic()

          logger.logWalletOperation(`New mnemonic generated: ${mnemonic?.toString()}`)
          // show mnemonic to user
          Notify.create({
            message: `Your wallet mnemonic: ${mnemonic?.toString()}. Please store it securely!`,
            color: 'orange',
            position: 'top',
            timeout: 0,
            actions: [
              {
                label: 'Close',
                color: 'white',
                handler: () => {
                  /* User dismissed the notification */
                },
              },
            ],
          })
          logger.logWalletOperation('New wallet generated')
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


        const walletIsOpen = this.wallet?.isOpen()
        if (
          walletIsOpen &&
          (await this.wallet?.federation.getFederationId()) !== selectedFederation.federationId
        ) {
          await this.closeWallet()
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
      if (this.wallet?.isOpen() !== true) {
        return []
      }
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
        if (this.wallet?.isOpen()) {
          await this.closeWallet()
        }

        // FIXME is this still needed with the new Fedimint version?
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

    async getMnemonic(): Promise<string[] | undefined> {
      const mnemonic = await this.director?.getMnemonic()
      if (mnemonic == null) {
        return undefined
      }
      return mnemonic
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
