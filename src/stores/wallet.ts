import { defineStore, acceptHMRUpdate } from 'pinia'
import type {  MSats, Transactions } from '@fedimint/core-web'
import { FedimintWallet } from '@fedimint/core-web'
import { useFederationStore } from './federation'
import { ref } from 'vue'
import type { Federation, FederationMeta, ModuleConfig } from 'src/components/models'


export const useWalletStore = defineStore('wallet', {
  state: () => ({
    wallet: null as FedimintWallet | null,
    balance: ref(0),
  }),
  actions: {
    initWallet() {
      if (!this.wallet) {
        this.wallet = new FedimintWallet()
      }
    },
    async openWallet() {
      const federationStore = useFederationStore()
      const selectedFederation = federationStore.selectedFederation

      if (selectedFederation) {
        console.log('Opening wallet for federation', selectedFederation.federationId)

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
            console.log('Joining federation', selectedFederation.federationId)
            const joined = await this.wallet?.joinFederation(
              selectedFederation.inviteCode,
              selectedFederation.federationId,
            )
            console.log('Joined federation', joined)
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
      if (opsId) {
        this.wallet?.mint.subscribeReissueExternalNotes(opsId, (_state) => {
          this.updateBalance()
            .then(() => console.log('Balance updated after state change'))
            .catch((err) => console.error('Error updating balance:', err))
        })
      }
      return amount
    },

    async getTransactions(): Promise<Transactions[]> {
  try {
    const transactions = await this.wallet?.federation.listTransactions(10)
    return transactions || [] // Handle undefined case
  } catch (error) {
    console.error('Error fetching transactions:', error)
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
            console.log(`Successfully deleted database ${federationId}`)
            resolve()
          }
        })
      } catch (error) {
        console.error('Error deleting federation data:', error)
        throw error
      }
    },

    async handleFederationChange() {
      await this.openWallet()
    },
    async updateBalance() {
      if (this.wallet) {
        this.balance = ((await this.wallet.balance.getBalance()) ?? 0) / 1_000
      } else {
        this.balance = 0
      }
    },

    async getMetadata(federation: Federation): Promise<FederationMeta | undefined> {
      if (!federation.metaUrl) {
        console.warn('No metaUrl provided for federation:', federation)
        return undefined
      }
      try {
        const response = await fetch(federation.metaUrl)
        console.log('federation url', federation.metaUrl)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        console.log('Fetched metadata:', data)
        const metadata = Object.values(data)[0] as FederationMeta
        return metadata
      } catch (error) {
        console.error('Failed to fetch metadata:', error)
        return undefined
      }
    },

    async previewFederation(inviteCode: string): Promise<Federation | undefined> {
      const result = await this.wallet?.previewFederation(inviteCode)
      if (!result) {
        return undefined
      }

      const { config, federation_id } = result
      console.log('Previewed federation config:', federation_id, config)

      const typedConfig = config as {
        global?: {
          meta?: {
            federation_name?: string
            meta_external_url?: string
          }
        }
        modules?: Record<string, unknown>
      }

      const federationName = typedConfig?.global?.meta?.federation_name || 'Unknown Federation'

      const metaExternalUrl = typedConfig?.global?.meta?.meta_external_url as string
      const modules = config?.modules || {}

      let meta: FederationMeta

      if (metaExternalUrl) {
        try {
          const response = await fetch(metaExternalUrl)

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          const data = await response.json()
          console.log('Fetched metadata:', data)
          meta = Object.values(data)[0] as FederationMeta
          console.log('Parsed metadata:', meta)
        } catch (error) {
          console.error('Failed to fetch metadata:', error)
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
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useWalletStore, import.meta.hot))
}
