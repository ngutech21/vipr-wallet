import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Federation } from 'src/types/federation'
import { useFederationStore } from 'src/stores/federation'

const walletStoreMock = vi.hoisted(() => ({
  openWallet: vi.fn<() => Promise<void>>(),
  wallet: null as object | null,
}))

vi.mock('src/stores/wallet', () => ({
  useWalletStore: () => walletStoreMock,
}))

import { selectFederationAndOpenWallet } from 'src/composables/useFederationSelection'

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

describe('useFederationSelection', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
    walletStoreMock.wallet = null
  })

  it('selects the federation and opens the wallet', async () => {
    const federationStore = useFederationStore()
    const federation = createFederation()
    federationStore.federations = [federation]
    federationStore.selectedFederationId = null
    walletStoreMock.openWallet.mockResolvedValue()

    await selectFederationAndOpenWallet(federation)

    expect(walletStoreMock.openWallet).toHaveBeenCalledTimes(1)
    expect(federationStore.selectedFederationId).toBe(federation.federationId)
  })

  it('passes restore join options to the wallet store', async () => {
    const federationStore = useFederationStore()
    const federation = createFederation()
    federationStore.federations = [federation]
    walletStoreMock.openWallet.mockResolvedValue()

    await selectFederationAndOpenWallet(federation, {
      expectRecovery: true,
      recoverOnJoin: true,
    })

    expect(walletStoreMock.openWallet).toHaveBeenCalledWith({
      expectRecovery: true,
      recoverOnJoin: true,
    })
  })

  it('restores the previous selected federation when wallet open fails', async () => {
    const federationStore = useFederationStore()
    const first = createFederation({ federationId: 'fed-1' })
    const second = createFederation({ federationId: 'fed-2' })
    federationStore.federations = [first, second]
    federationStore.selectedFederationId = first.federationId
    walletStoreMock.openWallet.mockRejectedValue(new Error('open failed'))

    await expect(selectFederationAndOpenWallet(second)).rejects.toThrow('open failed')

    expect(walletStoreMock.openWallet).toHaveBeenCalledTimes(1)
    expect(federationStore.selectedFederationId).toBe(first.federationId)
  })

  it('opens the wallet when the federation is already selected but no wallet is active', async () => {
    const federationStore = useFederationStore()
    const federation = createFederation()
    federationStore.addFederation(federation)
    walletStoreMock.openWallet.mockResolvedValue()
    walletStoreMock.wallet = null

    await selectFederationAndOpenWallet(federation)

    expect(walletStoreMock.openWallet).toHaveBeenCalledTimes(1)
    expect(federationStore.selectedFederationId).toBe(federation.federationId)
  })

  it('skips opening when the selected federation already has an active wallet', async () => {
    const federationStore = useFederationStore()
    const federation = createFederation()
    federationStore.addFederation(federation)
    walletStoreMock.wallet = {}

    await selectFederationAndOpenWallet(federation)

    expect(walletStoreMock.openWallet).not.toHaveBeenCalled()
  })
})
