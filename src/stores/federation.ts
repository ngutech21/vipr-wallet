import { defineStore } from 'pinia'
import type { Federation } from 'src/components/models'
import { useWalletStore } from './wallet'
import { useLocalStorage } from '@vueuse/core'

export const useFederationStore = defineStore('federation', {
  state: () => ({
    federations: useLocalStorage<Federation[]>('vipr.federations', []),
    selectedFederationId: useLocalStorage<string | null>('vipr.federationid.selected', null),
  }),

  getters: {
    selectedFederation: (state): Federation | undefined => {
      return state.federations.find((f) => f.federationId === state.selectedFederationId)
    },
  },
  actions: {
    addFederation(newFedi: Federation) {
      this.federations.push(newFedi)
    },
    deleteFederation(federationId: string) {
      this.federations = this.federations.filter((f) => f.federationId !== federationId)
      if (this.selectedFederationId === federationId) {
        this.selectedFederationId = null
      }
    },
    async selectFederation(fedi: Federation | undefined) {
      this.selectedFederationId = fedi?.federationId ?? null
      const walletStore = useWalletStore()
      await walletStore.openWallet()
    },
  },
})
