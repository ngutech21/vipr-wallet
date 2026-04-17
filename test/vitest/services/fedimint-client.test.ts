import { beforeEach, describe, expect, it, vi } from 'vitest'

type MockWalletLike = {
  openMock: ReturnType<typeof vi.fn>
  joinMock: ReturnType<typeof vi.fn>
  isOpen: () => boolean
}

const UUID_V5_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const coreMockState = vi.hoisted(() => ({
  getMnemonicValue: new Error(
    'No wallet mnemonic set. Please set or generate a mnemonic first.',
  ) as unknown,
  joinFederationErrorOnce: null as Error | null,
  openWalletSuccessOnce: false,
  generateMnemonicValue: [
    'abandon',
    'ability',
    'able',
    'about',
    'above',
    'absent',
    'absorb',
    'abstract',
    'absurd',
    'abuse',
    'access',
    'accident',
  ] as unknown,
  setMnemonicSpy: vi.fn(() => Promise.resolve(true)),
  rpcStreamSpy: vi.fn(() => vi.fn()),
}))

vi.mock('@fedimint/transport-web', () => ({
  WasmWorkerTransport: class MockWasmWorkerTransport {},
}))

vi.mock('@fedimint/core', () => {
  class MockFedimintWallet {
    private joined = false
    private _client: { rpcStream: typeof coreMockState.rpcStreamSpy }
    private _clientName: string
    wallet: {
      subscribeDeposit: ReturnType<typeof vi.fn>
      clientName: string
    }

    constructor(_client: unknown, _clientName = 'default-client') {
      this._client = {
        rpcStream: coreMockState.rpcStreamSpy,
      }
      this._clientName = _clientName
      this.wallet = {
        subscribeDeposit: vi.fn(() => vi.fn()),
        clientName: _clientName,
      }
    }

    readonly openMock = vi.fn((_clientName?: string) => {
      if (coreMockState.openWalletSuccessOnce) {
        coreMockState.openWalletSuccessOnce = false
        this.joined = true
      }
      return Promise.resolve(this.joined)
    })
    readonly joinMock = vi.fn((_inviteCode: string, _clientName?: string) => {
      if (coreMockState.joinFederationErrorOnce != null) {
        const error = coreMockState.joinFederationErrorOnce
        coreMockState.joinFederationErrorOnce = null
        return Promise.reject(error)
      }
      this.joined = true
      return Promise.resolve(true)
    })

    open(clientName?: string) {
      return this.openMock(clientName)
    }

    joinFederation(inviteCode: string, _clientName?: string) {
      return this.joinMock(inviteCode, _clientName)
    }

    cleanup = vi.fn(() => Promise.resolve())

    isOpen() {
      return this.joined
    }

    federation = {
      getFederationId: vi.fn(() => Promise.resolve('fed-1')),
    }
  }

  class MockWalletDirector {
    protected _client = {}
    initialize = vi.fn(() => Promise.resolve())
    setLogLevel = vi.fn()
    previewFederation = vi.fn((inviteCode: string) =>
      Promise.resolve({
        config: {
          global: {
            meta: {
              federation_name: 'Preview Federation',
            },
          },
        },
        federation_id: `fed-${inviteCode}`,
      }),
    )
    parseOobNotes = vi.fn((notes: string) =>
      Promise.resolve({
        total_amount: 12_000,
        federation_id_prefix: 'fed1',
        federation_id: `fed-${notes}`,
        invite_code: 'fed11invite',
        note_counts: { '1000': 12 },
      }),
    )
    createWallet = vi.fn(() => Promise.resolve(new MockFedimintWallet(this._client)))
    getMnemonic = vi.fn(() => {
      const value = coreMockState.getMnemonicValue
      if (value instanceof Error) {
        return Promise.reject(value)
      }
      return Promise.resolve(value)
    })
    generateMnemonic = vi.fn(() => {
      const value = coreMockState.generateMnemonicValue
      if (value instanceof Error) {
        return Promise.reject(value)
      }
      return Promise.resolve(value)
    })
    setMnemonic = coreMockState.setMnemonicSpy
  }

  return {
    FedimintWallet: MockFedimintWallet,
    WalletDirector: MockWalletDirector,
  }
})

import { fedimintClient } from 'src/services/fedimint-client'

describe('fedimint client adapter', () => {
  beforeEach(() => {
    fedimintClient.reset()
    vi.clearAllMocks()
    coreMockState.getMnemonicValue = new Error(
      'No wallet mnemonic set. Please set or generate a mnemonic first.',
    )
    coreMockState.joinFederationErrorOnce = null
    coreMockState.openWalletSuccessOnce = false
    coreMockState.generateMnemonicValue = [
      'abandon',
      'ability',
      'able',
      'about',
      'above',
      'absent',
      'absorb',
      'abstract',
      'absurd',
      'abuse',
      'access',
      'accident',
    ]
    coreMockState.setMnemonicSpy.mockResolvedValue(true)
    coreMockState.rpcStreamSpy.mockReset()
    coreMockState.rpcStreamSpy.mockReturnValue(vi.fn())
  })

  it('joins federation first for unknown wallets', async () => {
    const wallet = await fedimintClient.ensureWalletOpen({
      walletName: 'wallet-fed-1',
      federationId: 'fed-1',
      inviteCode: 'invite-1',
    })

    const mockedWallet = wallet as unknown as MockWalletLike
    expect(mockedWallet.joinMock).toHaveBeenCalledWith(
      'invite-1',
      expect.stringMatching(UUID_V5_PATTERN),
    )
    expect(mockedWallet.joinMock.mock.calls[0]?.[1]).not.toBe('wallet-fed-1')
    expect(mockedWallet.openMock).not.toHaveBeenCalled()
    expect(mockedWallet.isOpen()).toBe(true)
  })

  it('opens known wallets on subsequent calls', async () => {
    const wallet = (await fedimintClient.ensureWalletOpen({
      walletName: 'wallet-fed-1',
      federationId: 'fed-1',
      inviteCode: 'invite-1',
    })) as unknown as MockWalletLike
    const firstClientName = wallet.joinMock.mock.calls[0]?.[1]
    expect(firstClientName).toEqual(expect.stringMatching(UUID_V5_PATTERN))
    wallet.openMock.mockResolvedValue(true)
    wallet.joinMock.mockClear()
    wallet.openMock.mockClear()

    const openedWallet = (await fedimintClient.ensureWalletOpen({
      walletName: 'wallet-fed-1',
      federationId: 'fed-1',
      inviteCode: 'invite-1',
    })) as unknown as MockWalletLike

    expect(openedWallet.openMock).toHaveBeenCalledWith(firstClientName)
    expect(openedWallet.joinMock).not.toHaveBeenCalled()
  })

  it('overrides wallet deposit subscription to use the wallet module stream', async () => {
    const wallet = await fedimintClient.ensureWalletOpen({
      walletName: 'wallet-fed-1',
      federationId: 'fed-1',
      inviteCode: 'invite-1',
    })

    const onSuccess = vi.fn()
    const onError = vi.fn()

    wallet.wallet.subscribeDeposit('operation-1', onSuccess, onError)

    expect(coreMockState.rpcStreamSpy).toHaveBeenCalledWith(
      'wallet',
      'subscribe_deposit',
      { operation_id: 'operation-1' },
      expect.stringMatching(UUID_V5_PATTERN),
      onSuccess,
      onError,
    )
  })

  it('falls back to open when join reports no modification allowed', async () => {
    coreMockState.joinFederationErrorOnce = new Error('No modification allowed')
    coreMockState.openWalletSuccessOnce = true

    const wallet = (await fedimintClient.ensureWalletOpen({
      walletName: 'wallet-fed-1',
      federationId: 'fed-1',
      inviteCode: 'invite-1',
    })) as unknown as MockWalletLike

    expect(wallet.joinMock).toHaveBeenCalledTimes(1)
    expect(wallet.openMock).toHaveBeenCalledTimes(1)
    expect(wallet.isOpen()).toBe(true)
  })

  it('tracks known wallet names for list/delete/clear', async () => {
    await fedimintClient.ensureWalletOpen({
      walletName: 'wallet-fed-1',
      federationId: 'fed-1',
      inviteCode: 'invite-1',
    })
    await fedimintClient.ensureWalletOpen({
      walletName: 'wallet-fed-2',
      federationId: 'fed-2',
      inviteCode: 'invite-2',
    })

    expect(await fedimintClient.listWallets()).toEqual(['wallet-fed-1', 'wallet-fed-2'])

    await fedimintClient.deleteWallet('wallet-fed-1')
    expect(await fedimintClient.listWallets()).toEqual(['wallet-fed-2'])

    await fedimintClient.clearAllWallets()
    expect(await fedimintClient.listWallets()).toEqual([])
  })

  it('parses oob notes through the wallet director', async () => {
    const parsed = await fedimintClient.parseOobNotes('notes-1')

    expect(parsed).toEqual({
      total_amount: 12_000,
      federation_id_prefix: 'fed1',
      federation_id: 'fed-notes-1',
      invite_code: 'fed11invite',
      note_counts: { '1000': 12 },
    })
  })

  it('normalizes federation preview response', async () => {
    const preview = await fedimintClient.previewFederation('invite-123')

    expect(preview.federation_id).toBe('fed-invite-123')
    expect(preview.config).toEqual(
      expect.objectContaining({
        global: expect.any(Object),
      }),
    )
  })

  it('returns existing mnemonic without generating', async () => {
    coreMockState.getMnemonicValue = ['alpha', 'beta', 'gamma', 'delta']

    const result = await fedimintClient.ensureMnemonic()

    expect(result.created).toBe(false)
    expect(result.words).toEqual(['alpha', 'beta', 'gamma', 'delta'])
  })

  it('auto-generates mnemonic when mnemonic is missing', async () => {
    const result = await fedimintClient.ensureMnemonic()

    expect(result.created).toBe(true)
    expect(result.words.length).toBe(12)
    expect(coreMockState.setMnemonicSpy).not.toHaveBeenCalled()
  })

  it('auto-generates mnemonic when getMnemonic reports missing', async () => {
    coreMockState.generateMnemonicValue = ['sun', 'moon', 'star']

    const result = await fedimintClient.ensureMnemonic()

    expect(result.created).toBe(true)
    expect(result.words).toEqual(['sun', 'moon', 'star'])
    expect(coreMockState.setMnemonicSpy).not.toHaveBeenCalled()
  })

  it('throws when mnemonic generation fails', async () => {
    coreMockState.generateMnemonicValue = new Error('generate failed')

    await expect(fedimintClient.ensureMnemonic()).rejects.toThrow('generate failed')
    expect(coreMockState.setMnemonicSpy).not.toHaveBeenCalled()
  })

  it('getMnemonicIfSet returns null for missing mnemonic', async () => {
    coreMockState.getMnemonicValue = null

    const result = await fedimintClient.getMnemonicIfSet()

    expect(result).toBeNull()
  })

  it('getMnemonic throws when mnemonic is missing', async () => {
    coreMockState.getMnemonicValue = null

    await expect(fedimintClient.getMnemonic()).rejects.toThrow('No wallet mnemonic set')
  })

  it('getMnemonicIfSet returns null when getMnemonic reports missing', async () => {
    coreMockState.getMnemonicValue = new Error(
      'No wallet mnemonic set. Please set or generate a mnemonic first.',
    )

    const result = await fedimintClient.getMnemonicIfSet()

    expect(result).toBeNull()
  })

  it('getMnemonicIfSet rethrows invalid mnemonic responses', async () => {
    coreMockState.getMnemonicValue = { unexpected: true }

    await expect(fedimintClient.getMnemonicIfSet()).rejects.toThrow('Invalid mnemonic response')
  })

  it('getMnemonicIfSet accepts object responses with mnemonic field', async () => {
    coreMockState.getMnemonicValue = { mnemonic: ['alpha', 'beta', 'gamma'] }

    await expect(fedimintClient.getMnemonicIfSet()).resolves.toEqual(['alpha', 'beta', 'gamma'])
  })

  it('getMnemonicIfSet rethrows non-recoverable errors', async () => {
    coreMockState.getMnemonicValue = new Error('transport exploded')

    await expect(fedimintClient.getMnemonicIfSet()).rejects.toThrow('transport exploded')
  })
})
