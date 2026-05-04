import { defineStore } from 'pinia'
import type { Federation, FederationMeta } from 'src/types/federation'
import { useWalletStore } from './wallet'
import { useLocalStorage } from '@vueuse/core'
import {
  getFederationTitleFallback,
  normalizeFederationMetadata,
} from 'src/services/federation-metadata'

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
      const normalizedMetadata = normalizeFederationMetadata(newFedi.metadata)
      const normalizedFederation = {
        ...newFedi,
        title: getFederationTitleFallback(normalizedMetadata, newFedi.title),
        metadata: normalizedMetadata,
      }
      const existingIndex = this.federations.findIndex(
        (federation) => federation.federationId === normalizedFederation.federationId,
      )

      if (existingIndex >= 0) {
        this.federations[existingIndex] = normalizedFederation
        this.ensureValidSelection()
        return
      }

      this.federations.push(normalizedFederation)
      this.ensureValidSelection()
    },

    ensureValidSelection(): Federation | undefined {
      this.normalizeStoredFederations()
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

    updateFederationMetadata(federationId: string, metadata: FederationMeta) {
      const federationIndex = this.federations.findIndex(
        (federation) => federation.federationId === federationId,
      )
      if (federationIndex < 0) {
        return
      }

      const federation = this.federations[federationIndex]
      if (federation == null) {
        return
      }

      const normalizedMetadata = normalizeFederationMetadata(metadata)
      this.federations[federationIndex] = {
        ...federation,
        title: getFederationTitleFallback(normalizedMetadata, federation.title),
        metadata: normalizedMetadata,
      }
    },

    normalizeStoredFederations() {
      this.federations = this.federations.map((federation) => {
        const normalizedMetadata = normalizeFederationMetadata(federation.metadata)
        return {
          ...federation,
          title: getFederationTitleFallback(normalizedMetadata, federation.title),
          metadata: normalizedMetadata,
        }
      })
    },

    async selectFederation(
      fedi: Federation | undefined,
      options: { expectRecovery?: boolean; recoverOnJoin?: boolean } = {},
    ) {
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
        await walletStore.openWallet(options)
      } catch (error) {
        this.selectedFederationId = previousSelectedFederationId
        throw error
      }
    },
  },
})
