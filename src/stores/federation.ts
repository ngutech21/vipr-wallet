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
      this.ensureValidSelection()
    },

    ensureValidSelection(): Federation | undefined {
      const selectedFederation = this.federations.find(
        (f) => f.federationId === this.selectedFederationId,
      )

      if (selectedFederation != null) {
        return selectedFederation
      }

      const fallbackFederation = this.federations[0]
      this.selectedFederationId = fallbackFederation?.federationId ?? null
      return fallbackFederation
    },

    deleteFederation(federationId: string) {
      this.federations = this.federations.filter((f) => f.federationId !== federationId)
      this.ensureValidSelection()
    },

    async selectFederation(fedi: Federation | undefined) {
      const previousSelectedFederationId = this.selectedFederationId
      const nextFederation = fedi ?? this.ensureValidSelection()
      this.selectedFederationId = nextFederation?.federationId ?? null

      if (previousSelectedFederationId === this.selectedFederationId) {
        return
      }

      const walletStore = useWalletStore()
      try {
        await walletStore.openWallet()
      } catch (error) {
        this.selectedFederationId = previousSelectedFederationId
        throw error
      }
    },
  },
})
