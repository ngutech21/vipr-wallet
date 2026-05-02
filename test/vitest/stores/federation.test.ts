import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Federation } from 'src/types/federation'

const walletStoreMock = vi.hoisted(() => ({
  openWallet: vi.fn<() => Promise<void>>(),
  wallet: null as object | null,
}))

vi.mock('src/stores/wallet', () => ({
  useWalletStore: () => walletStoreMock,
}))

import { useFederationStore } from 'src/stores/federation'

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
    walletStoreMock.openWallet.mockReset()
    walletStoreMock.wallet = null
  })

  it('keeps selected federation when wallet opens successfully', async () => {
    const federationStore = useFederationStore()
    const federation = createFederation()
    federationStore.federations = [federation]
    federationStore.selectedFederationId = null
    walletStoreMock.openWallet.mockResolvedValue()

    await federationStore.selectFederation(federation)

    expect(walletStoreMock.openWallet).toHaveBeenCalledTimes(1)
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

  it('restores previous selected federation when wallet open fails', async () => {
    const federationStore = useFederationStore()
    const first = createFederation({ federationId: 'fed-1' })
    const second = createFederation({ federationId: 'fed-2' })
    federationStore.federations = [first, second]
    federationStore.selectedFederationId = first.federationId
    walletStoreMock.openWallet.mockRejectedValue(new Error('open failed'))

    await expect(federationStore.selectFederation(second)).rejects.toThrow('open failed')

    expect(walletStoreMock.openWallet).toHaveBeenCalledTimes(1)
    expect(federationStore.selectedFederationId).toBe(first.federationId)
  })

  it('opens the wallet when the federation is already selected but no wallet is active', async () => {
    const federationStore = useFederationStore()
    const federation = createFederation()
    federationStore.addFederation(federation)
    walletStoreMock.openWallet.mockResolvedValue()
    walletStoreMock.wallet = null

    await federationStore.selectFederation(federation)

    expect(walletStoreMock.openWallet).toHaveBeenCalledTimes(1)
    expect(federationStore.selectedFederationId).toBe(federation.federationId)
  })
})
