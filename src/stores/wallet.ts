import { defineStore, acceptHMRUpdate } from 'pinia'
import type { JSONValue } from '@fedimint/core-web'
import { FedimintWallet } from '@fedimint/core-web'
import { useFederationStore } from './federation'
import { ref } from 'vue'
import type { Federation, FederationConfig, FederationMeta } from 'src/components/models'

export const useWalletStore = defineStore('wallet', {
  state: () => ({
    wallet: null as FedimintWallet | null,
    balance: ref(0),
  }),
  actions: {
    initWallet() {
      if (!this.wallet) {
        this.wallet = new FedimintWallet()
        console.log('Wallet initialized')
      }
    },
    async openWallet() {
      const federationStore = useFederationStore()
      const selectedFederation = federationStore.selectedFederation

      console.log('openWallet() Selected federation', selectedFederation)
      if (selectedFederation) {
        console.log('Opening wallet for federation', selectedFederation.federationId)

        const walletIsOpen = this.wallet?.isOpen()
        if (
          walletIsOpen &&
          (await this.wallet?.federation.getFederationId()) !== selectedFederation.federationId
        ) {
          await this.closeWallet()
          this.wallet = new FedimintWallet()
          const open = this.wallet?.isOpen()
          console.log('Closing wallet isOpen=', open)
        }

        if (!this.wallet?.isOpen()) {
          console.log('Opening wallet')
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

        // Update balance after opening the wallet
        await this.updateBalance()
      }
    },
    async closeWallet() {
      await this.wallet?.cleanup()
      this.wallet = null
    },
    async handleFederationChange() {
      await this.openWallet()
    },
    async updateBalance() {
      if (this.wallet) {
        const balance = ((await this.wallet.balance.getBalance()) ?? 0) / 1_000
        this.balance = balance
        console.log('Balance updated:', balance)
      }
    },

    async getMetadata(federation: Federation): Promise<FederationMeta | undefined> {
      try {
        const response = await fetch(federation.metaUrl)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        const metadata = Object.values(data)[0] as FederationMeta
        return metadata
      } catch (error) {
        console.error('Failed to fetch metadata:', error)
        return undefined
      }
    },

    async isValidInviteCode(inviteCode: string): Promise<Federation | undefined> {
      const tmpWallet = new FedimintWallet()
      if (tmpWallet) {
        await tmpWallet.joinFederation(inviteCode, inviteCode)
        const federationId = await tmpWallet.federation.getFederationId()
        const rawConfig = await tmpWallet.federation.getConfig()
        if (!rawConfig) {
          await tmpWallet.cleanup()
          return undefined
        }
        const fediConfig = extractFederationInfo(rawConfig)
        await tmpWallet.cleanup()
        return {
          title: fediConfig.federationName,
          inviteCode: inviteCode,
          federationId: federationId,
          metaUrl: fediConfig.metaUrl,
        } as Federation
      }
      return undefined
    },
  },
})
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useWalletStore, import.meta.hot))
}

function extractFederationInfo(config: JSONValue): { federationName: string; metaUrl: string } {
  const typedConfig = config as unknown as FederationConfig
  const {
    meta: { federation_name, meta_external_url },
  } = typedConfig

  return {
    federationName: federation_name,
    metaUrl: meta_external_url,
  }
}
