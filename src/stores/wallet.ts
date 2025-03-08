import { defineStore, acceptHMRUpdate } from 'pinia'
import type { JSONValue } from '@fedimint/core-web'
import { FedimintWallet } from '@fedimint/core-web'
import { useFederationStore } from './federation'
import { ref } from 'vue'
import type {
  Federation,
  FederationConfig,
  FederationMeta,
  ModuleConfig,
} from 'src/components/models'

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
      }
      // Update balance after opening the wallet
      await this.updateBalance()
    },
    async closeWallet() {
      await this.wallet?.cleanup()
      this.wallet = null
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
        const balance = ((await this.wallet.balance.getBalance()) ?? 0) / 1_000
        this.balance = balance
      } else {
        this.balance = 0
      }
    },

    async getMetadata(federation: Federation): Promise<FederationMeta | undefined> {
      if (!federation.metaUrl) {
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

    async getFederationByInviteCode(inviteCode: string): Promise<Federation | undefined> {
      const tmpWallet = new FedimintWallet()
      if (tmpWallet) {
        await tmpWallet.joinFederation(inviteCode, inviteCode)
        const federationId = await tmpWallet.federation.getFederationId()
        const rawConfig = await tmpWallet.federation.getConfig()
        if (!rawConfig) {
          await this.deleteFederationData(inviteCode)
          return undefined
        }
        const fediConfig = extractFederationInfo(rawConfig)
        await this.deleteFederationData(inviteCode)

        return {
          title: fediConfig.federationName,
          inviteCode: inviteCode,
          federationId: federationId,
          metaUrl: fediConfig.metaUrl || '',
          modules: fediConfig.modules,
        } satisfies Federation
      }
      return undefined
    },
  },
})
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useWalletStore, import.meta.hot))
}

function extractFederationInfo(config: JSONValue): {
  federationName: string
  metaUrl?: string
  modules: ModuleConfig[]
} {
  const typedConfig = config as unknown as FederationConfig
  const {
    meta: { federation_name, meta_external_url },
    modules,
  } = typedConfig

  // Convert modules object with numeric keys to an array
  const moduleArray: ModuleConfig[] = modules
    ? Object.values(modules).map((module) => ({
        config: module.config,
        kind: module.kind,
        version: {
          major: module.version.major,
          minor: module.version.minor,
        },
      }))
    : []

  return {
    federationName: federation_name,
    metaUrl: meta_external_url,
    modules: moduleArray,
  }
}
