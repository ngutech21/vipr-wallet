import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Federation } from 'src/components/models'

const walletStoreMock = vi.hoisted(() => ({
  openWallet: vi.fn<() => Promise<void>>(),
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
})
