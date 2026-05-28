import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Federation } from 'src/types/federation'

import {
  deleteFederationById,
  resolveSelectedFederationId,
  updateFederationMetadataInList,
  upsertFederation,
  useFederationStore,
} from 'src/stores/federation'

function createFederation(overrides: Partial<Federation> = {}): Federation {
  return {
    title: 'Test Federation',
    inviteCode: 'fed11test',
    federationId: 'fed-1',
    modules: [],
    metadata: {},
    ...overrides,
  }
}

describe('federation store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('selects a federation', () => {
    const federationStore = useFederationStore()
    const federation = createFederation()
    federationStore.federations = [federation]
    federationStore.selectedFederationId = null

    const selectedFederation = federationStore.selectFederation(federation)

    expect(selectedFederation).toEqual(federation)
    expect(federationStore.selectedFederationId).toBe(federation.federationId)
  })

  it('selects the first federation when selection is missing', () => {
    const federationStore = useFederationStore()
    const first = createFederation({ federationId: 'fed-1' })
    const second = createFederation({ federationId: 'fed-2' })
    federationStore.federations = [first, second]
    federationStore.selectedFederationId = null

    const selectedFederation = federationStore.ensureValidSelection()

    expect(selectedFederation?.federationId).toBe(first.federationId)
    expect(federationStore.selectedFederationId).toBe(first.federationId)
  })

  it('does not duplicate an existing federation when added again', () => {
    const federationStore = useFederationStore()
    const federation = createFederation()

    federationStore.addFederation(federation)
    federationStore.addFederation(federation)

    expect(federationStore.federations).toEqual([federation])
    expect(federationStore.selectedFederationId).toBe(federation.federationId)
  })

  it('normalizes old metadata keys when adding a federation', () => {
    const federationStore = useFederationStore()
    const federation = createFederation({
      title: 'Fallback Federation',
      metadata: {
        federation_name: 'Normalized Federation',
        federation_icon_url: 'https://legacy.example/icon.png',
        max_invoice_msats: '50000',
        chat_server_domain: 'chat.example.com',
      } as never,
    })

    federationStore.addFederation(federation)

    expect(federationStore.federations[0]).toMatchObject({
      title: 'Normalized Federation',
      metadata: {
        federationName: 'Normalized Federation',
        iconUrl: 'https://legacy.example/icon.png',
        maxInvoiceMsats: 50_000,
      },
    })
    expect(federationStore.federations[0]?.metadata).not.toHaveProperty('chat_server_domain')
  })

  it('updates normalized metadata on an existing federation', () => {
    const federationStore = useFederationStore()
    const federation = createFederation({
      metadata: {
        iconUrl: 'https://legacy.example/icon.png',
      },
    })
    federationStore.federations = [federation]

    federationStore.updateFederationMetadata(federation.federationId, {
      federationName: 'Meta Federation',
      iconUrl: 'https://meta.example/icon.png',
    })

    expect(federationStore.federations[0]).toMatchObject({
      title: 'Meta Federation',
      metadata: {
        federationName: 'Meta Federation',
        iconUrl: 'https://meta.example/icon.png',
      },
    })
  })

  it('updates an existing federation in place when added with the same federation id', () => {
    const federationStore = useFederationStore()
    const first = createFederation({ federationId: 'fed-1', title: 'Original Federation' })
    const second = createFederation({ federationId: 'fed-2', title: 'Second Federation' })
    const updatedFirst = createFederation({
      federationId: 'fed-1',
      title: 'Updated Federation',
      inviteCode: 'fed11updated',
    })
    federationStore.federations = [first, second]
    federationStore.selectedFederationId = second.federationId

    federationStore.addFederation(updatedFirst)

    expect(federationStore.federations).toEqual([updatedFirst, second])
    expect(federationStore.selectedFederationId).toBe(second.federationId)
  })

  it('repairs a stale selection by choosing the first available federation', () => {
    const federationStore = useFederationStore()
    const first = createFederation({ federationId: 'fed-1' })
    const second = createFederation({ federationId: 'fed-2' })
    federationStore.federations = [first, second]
    federationStore.selectedFederationId = 'missing-fed'

    const selectedFederation = federationStore.ensureValidSelection()

    expect(selectedFederation?.federationId).toBe(first.federationId)
    expect(federationStore.selectedFederationId).toBe(first.federationId)
  })

  it('falls back to another federation when the active federation is deleted', () => {
    const federationStore = useFederationStore()
    const first = createFederation({ federationId: 'fed-1' })
    const second = createFederation({ federationId: 'fed-2' })
    federationStore.federations = [first, second]
    federationStore.selectedFederationId = first.federationId

    federationStore.deleteFederation(first.federationId)

    expect(federationStore.federations).toEqual([second])
    expect(federationStore.selectedFederationId).toBe(second.federationId)
  })

  it('clears the selection when the last federation is deleted', () => {
    const federationStore = useFederationStore()
    const federation = createFederation()
    federationStore.federations = [federation]
    federationStore.selectedFederationId = federation.federationId

    federationStore.deleteFederation(federation.federationId)

    expect(federationStore.federations).toEqual([])
    expect(federationStore.selectedFederationId).toBeNull()
  })

  it('selects the provided federation without opening a wallet', () => {
    const federationStore = useFederationStore()
    const first = createFederation({ federationId: 'fed-1' })
    const second = createFederation({ federationId: 'fed-2' })
    federationStore.federations = [first, second]
    federationStore.selectedFederationId = first.federationId

    federationStore.selectFederation(second)

    expect(federationStore.selectedFederationId).toBe(second.federationId)
  })

  it('repairs selection when selecting without a provided federation', () => {
    const federationStore = useFederationStore()
    const federation = createFederation()
    federationStore.addFederation(federation)
    federationStore.selectedFederationId = 'missing-fed'

    const selectedFederation = federationStore.selectFederation(undefined)

    expect(selectedFederation).toEqual(federation)
    expect(federationStore.selectedFederationId).toBe(federation.federationId)
  })
})

describe('federation state helpers', () => {
  it('upserts federations immutably and preserves list order for replacements', () => {
    const first = createFederation({ federationId: 'fed-1', title: 'Original Federation' })
    const second = createFederation({ federationId: 'fed-2', title: 'Second Federation' })
    const updatedFirst = createFederation({
      federationId: 'fed-1',
      title: 'Updated Federation',
      inviteCode: 'fed11updated',
    })
    const federations = [first, second]

    expect(upsertFederation(federations, updatedFirst)).toEqual([updatedFirst, second])
    expect(federations).toEqual([first, second])

    expect(upsertFederation(federations, createFederation({ federationId: 'fed-3' }))).toEqual([
      first,
      second,
      createFederation({ federationId: 'fed-3' }),
    ])
  })

  it('normalizes federation metadata during upsert', () => {
    expect(
      upsertFederation(
        [],
        createFederation({
          title: 'Fallback Federation',
          metadata: {
            federation_name: 'Normalized Federation',
            federation_icon_url: 'https://legacy.example/icon.png',
            max_invoice_msats: '50000',
            chat_server_domain: 'chat.example.com',
          } as never,
        }),
      )[0],
    ).toMatchObject({
      title: 'Normalized Federation',
      metadata: {
        federationName: 'Normalized Federation',
        iconUrl: 'https://legacy.example/icon.png',
        maxInvoiceMsats: 50_000,
      },
    })
  })

  it('deletes federations immutably and resolves valid selections', () => {
    const first = createFederation({ federationId: 'fed-1' })
    const second = createFederation({ federationId: 'fed-2' })
    const federations = [first, second]
    const nextFederations = deleteFederationById(federations, first.federationId)

    expect(nextFederations).toEqual([second])
    expect(federations).toEqual([first, second])
    expect(resolveSelectedFederationId(nextFederations, first.federationId)).toBe(
      second.federationId,
    )
    expect(resolveSelectedFederationId([], second.federationId)).toBeNull()
    expect(resolveSelectedFederationId(federations, second.federationId)).toBe(second.federationId)
  })

  it('updates federation metadata immutably and returns the same list for missing federations', () => {
    const first = createFederation({
      federationId: 'fed-1',
      title: 'Fallback Federation',
      metadata: {
        iconUrl: 'https://legacy.example/icon.png',
      },
    })
    const second = createFederation({ federationId: 'fed-2', title: 'Second Federation' })
    const federations = [first, second]

    const nextFederations = updateFederationMetadataInList(federations, first.federationId, {
      federationName: 'Meta Federation',
      iconUrl: 'https://meta.example/icon.png',
    })

    expect(nextFederations).toEqual([
      {
        ...first,
        title: 'Meta Federation',
        metadata: {
          federationName: 'Meta Federation',
          iconUrl: 'https://meta.example/icon.png',
        },
      },
      second,
    ])
    expect(federations).toEqual([first, second])
    expect(updateFederationMetadataInList(federations, 'missing-fed', {})).toBe(federations)
  })
})
