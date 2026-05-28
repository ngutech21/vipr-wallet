import { defineStore } from 'pinia'
import type { Federation, FederationMeta } from 'src/types/federation'
import { useLocalStorage } from '@vueuse/core'
import {
  getFederationTitleFallback,
  normalizeFederationMetadata,
} from 'src/services/federation-metadata'

export function normalizeFederationForStorage(federation: Federation): Federation {
  const normalizedMetadata = normalizeFederationMetadata(federation.metadata)
  return {
    ...federation,
    title: getFederationTitleFallback(normalizedMetadata, federation.title),
    metadata: normalizedMetadata,
  }
}

export function normalizeFederationsForStorage(federations: Federation[]): Federation[] {
  return federations.map(normalizeFederationForStorage)
}

export function upsertFederation(federations: Federation[], federation: Federation): Federation[] {
  const normalizedFederation = normalizeFederationForStorage(federation)
  const federationExists = federations.some(
    (item) => item.federationId === normalizedFederation.federationId,
  )

  if (!federationExists) {
    return [...federations, normalizedFederation]
  }

  return federations.map((item) =>
    item.federationId === normalizedFederation.federationId ? normalizedFederation : item,
  )
}

export function deleteFederationById(
  federations: Federation[],
  federationId: string,
): Federation[] {
  return federations.filter((federation) => federation.federationId !== federationId)
}

export function resolveSelectedFederationId(
  federations: Federation[],
  selectedFederationId: string | null,
): string | null {
  if (federations.some((federation) => federation.federationId === selectedFederationId)) {
    return selectedFederationId
  }

  return federations[0]?.federationId ?? null
}

export function updateFederationMetadataInList(
  federations: Federation[],
  federationId: string,
  metadata: FederationMeta,
): Federation[] {
  const federationExists = federations.some(
    (federation) => federation.federationId === federationId,
  )
  if (!federationExists) {
    return federations
  }

  const normalizedMetadata = normalizeFederationMetadata(metadata)
  return federations.map((federation) =>
    federation.federationId === federationId
      ? {
          ...federation,
          title: getFederationTitleFallback(normalizedMetadata, federation.title),
          metadata: normalizedMetadata,
        }
      : federation,
  )
}

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
      this.federations = upsertFederation(this.federations, newFedi)
      this.ensureValidSelection()
    },

    ensureValidSelection(): Federation | undefined {
      this.normalizeStoredFederations()
      this.selectedFederationId = resolveSelectedFederationId(
        this.federations,
        this.selectedFederationId,
      )
      return this.federations.find(
        (federation) => federation.federationId === this.selectedFederationId,
      )
    },

    deleteFederation(federationId: string) {
      this.federations = deleteFederationById(this.federations, federationId)
      this.ensureValidSelection()
    },

    updateFederationMetadata(federationId: string, metadata: FederationMeta) {
      this.federations = updateFederationMetadataInList(this.federations, federationId, metadata)
    },

    normalizeStoredFederations() {
      this.federations = normalizeFederationsForStorage(this.federations)
    },

    selectFederation(fedi: Federation | undefined) {
      const nextFederation = fedi ?? this.ensureValidSelection()
      this.selectedFederationId = nextFederation?.federationId ?? null
      return nextFederation
    },
  },
})
