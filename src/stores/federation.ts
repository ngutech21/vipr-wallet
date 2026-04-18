import { defineStore } from 'pinia'
import type { Federation } from 'src/components/models'
import { useWalletStore } from './wallet'
import { useLocalStorage } from '@vueuse/core'

export const useFederationStore = defineStore('federation', {
  state: () => ({
    federations: useLocalStorage<Federation[]>('vipr.federations', []),
    selectedFederationId: useLocalStorage<string | null>('vipr.federationid.selected', null),
    pendingRecoveryFederationIds: useLocalStorage<string[]>(
      'vipr.federations.recovery.pending',
      [],
    ),
  }),

  getters: {
    selectedFederation: (state): Federation | undefined => {
      return state.federations.find((f) => f.federationId === state.selectedFederationId)
    },
  },
  actions: {
    addFederation(newFedi: Federation, options: { recover?: boolean } = {}) {
      if (!this.federations.some((f) => f.federationId === newFedi.federationId)) {
        this.federations.push(newFedi)
      }
      if (options.recover === true) {
        this.markFederationForRecovery(newFedi.federationId)
      }
      this.ensureValidSelection()
    },

    markFederationForRecovery(federationId: string) {
      if (federationId !== '' && !this.pendingRecoveryFederationIds.includes(federationId)) {
        this.pendingRecoveryFederationIds = [...this.pendingRecoveryFederationIds, federationId]
      }
    },

    clearFederationRecovery(federationId: string) {
      this.pendingRecoveryFederationIds = this.pendingRecoveryFederationIds.filter(
        (id) => id !== federationId,
      )
    },

    shouldRecoverFederation(federationId: string): boolean {
      return this.pendingRecoveryFederationIds.includes(federationId)
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
      this.clearFederationRecovery(federationId)
      this.ensureValidSelection()
    },

    async selectFederation(fedi: Federation | undefined) {
      const previousSelectedFederationId = this.selectedFederationId
      const nextFederation = fedi ?? this.ensureValidSelection()
      this.selectedFederationId = nextFederation?.federationId ?? null
      const walletStore = useWalletStore()

      if (
        previousSelectedFederationId === this.selectedFederationId &&
        walletStore.wallet != null
      ) {
        return
      }

      try {
        await walletStore.openWallet()
      } catch (error) {
        this.selectedFederationId = previousSelectedFederationId
        throw error
      }
    },
  },
})
