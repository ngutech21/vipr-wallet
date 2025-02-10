import { defineStore, acceptHMRUpdate } from 'pinia'
import { FedimintWallet } from '@fedimint/core-web'
import { useFederationStore } from './federation'
import { ref } from 'vue'

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

    async isValidInviteCode(inviteCode: string): Promise<string | undefined> {
      const tmpWallet = new FedimintWallet()
      if (tmpWallet) {
        await tmpWallet.joinFederation(inviteCode, inviteCode)
        const federationId = await tmpWallet.federation.getFederationId()
        await tmpWallet.cleanup()
        return federationId
      }
      return undefined
    },
  },
})
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useWalletStore, import.meta.hot))
}
