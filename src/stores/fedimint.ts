import { defineStore, acceptHMRUpdate } from 'pinia'
import { FedimintWallet } from '@fedimint/core-web'

export const useFedimintStore = defineStore('fedimint', {
  state: () => ({
    wallet: null as FedimintWallet | null,
  }),
  getters: {},
  actions: {
    initWallet() {
      if (!this.wallet) {
        this.wallet = new FedimintWallet()
      }
    },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useFedimintStore, import.meta.hot))
}
