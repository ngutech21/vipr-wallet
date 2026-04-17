import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FaucetService } from '../../e2e/utils/FaucetService'

describe('FaucetService bitcoind helpers', () => {
  const originalBitcoindUrl = process.env.FM_BITCOIND_URL
  const fetchMock = vi.fn()

  function getJsonBody(callIndex: number): unknown {
    const [, request] = fetchMock.mock.calls[callIndex] as [string, RequestInit]

    if (typeof request.body !== 'string') {
      throw new Error(`Expected fetch call ${callIndex} to use a JSON string body`)
    }

    return JSON.parse(request.body)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
    process.env.FM_BITCOIND_URL = 'http://bitcoin:secret@127.0.0.1:18443'
  })

  afterEach(() => {
    vi.unstubAllGlobals()

    if (originalBitcoindUrl == null) {
      delete process.env.FM_BITCOIND_URL
    } else {
      process.env.FM_BITCOIND_URL = originalBitcoindUrl
    }
  })

  it('uses FM_BITCOIND_URL for authenticated sendtoaddress RPC calls', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          result: 'txid-123',
          error: null,
          id: 'faucet-service:sendtoaddress',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const faucet = new FaucetService()
    const result = await faucet.sendToAddress('bcrt1qexampleaddress', 21_000)

    expect(result).toEqual({ txid: 'txid-123' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:18443/',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Basic Yml0Y29pbjpzZWNyZXQ=',
        }),
      }),
    )

    expect(getJsonBody(0)).toEqual({
      jsonrpc: '2.0',
      id: 'faucet-service:sendtoaddress',
      method: 'sendtoaddress',
      params: ['bcrt1qexampleaddress', 0.00021],
    })
  })

  it('mines blocks by getting an address, mining, and returning heights', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            result: 'bcrt1qminingaddress',
            error: null,
            id: 'faucet-service:getnewaddress',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            result: 125,
            error: null,
            id: 'faucet-service:getblockcount',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            result: ['hash-1', 'hash-2'],
            error: null,
            id: 'faucet-service:generatetoaddress',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            result: 127,
            error: null,
            id: 'faucet-service:getblockcount',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )

    const faucet = new FaucetService()
    const result = await faucet.mineBlocks(2)

    expect(result).toEqual({
      startHeight: 125,
      endHeight: 127,
      blockHashes: ['hash-1', 'hash-2'],
    })

    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(getJsonBody(0)).toEqual({
      jsonrpc: '2.0',
      id: 'faucet-service:getnewaddress',
      method: 'getnewaddress',
      params: [],
    })
    expect(getJsonBody(1)).toEqual({
      jsonrpc: '2.0',
      id: 'faucet-service:getblockcount',
      method: 'getblockcount',
      params: [],
    })
    expect(getJsonBody(2)).toEqual({
      jsonrpc: '2.0',
      id: 'faucet-service:generatetoaddress',
      method: 'generatetoaddress',
      params: [2, 'bcrt1qminingaddress'],
    })
    expect(getJsonBody(3)).toEqual({
      jsonrpc: '2.0',
      id: 'faucet-service:getblockcount',
      method: 'getblockcount',
      params: [],
    })
  })

  it('chains send and mine in sendToAddressAndMine', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            result: 'txid-456',
            error: null,
            id: 'faucet-service:sendtoaddress',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            result: 'bcrt1qminingaddress',
            error: null,
            id: 'faucet-service:getnewaddress',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            result: 200,
            error: null,
            id: 'faucet-service:getblockcount',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            result: ['hash-3'],
            error: null,
            id: 'faucet-service:generatetoaddress',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            result: 201,
            error: null,
            id: 'faucet-service:getblockcount',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )

    const faucet = new FaucetService()
    const result = await faucet.sendToAddressAndMine('bcrt1qdest', 50_000)

    expect(result).toEqual({
      txid: 'txid-456',
      startHeight: 200,
      endHeight: 201,
      blockHashes: ['hash-3'],
    })
    expect(fetchMock).toHaveBeenCalledTimes(5)
  })

  it('fails fast when FM_BITCOIND_URL is missing', async () => {
    delete process.env.FM_BITCOIND_URL

    const faucet = new FaucetService()

    await expect(faucet.mineBlocks(1)).rejects.toThrow(
      'FM_BITCOIND_URL is required for onchain faucet operations',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects invalid FM_BITCOIND_URL values without credentials', async () => {
    process.env.FM_BITCOIND_URL = 'http://127.0.0.1:18443'

    const faucet = new FaucetService()

    await expect(faucet.sendToAddress('bcrt1qdest', 1)).rejects.toThrow(
      'FM_BITCOIND_URL must include RPC username and password',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('normalizes JSON-RPC errors from bitcoind', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          result: null,
          error: {
            code: -18,
            message: 'Requested wallet does not exist or is not loaded',
          },
          id: 'faucet-service:getblockcount',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const faucet = new FaucetService()

    await expect(faucet.mineBlocks(1)).rejects.toThrow(
      'Bitcoind RPC getnewaddress failed with code -18: Requested wallet does not exist or is not loaded',
    )
  })
})
