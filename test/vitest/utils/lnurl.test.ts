import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Decoded } from 'bech32'
import { requestInvoice, resolveLnurl, submitLnurlWithdrawInvoice } from 'src/utils/lnurl'

// Mock bech32 module at the top level
vi.mock('bech32', () => ({
  bech32: {
    decode: vi.fn(),
    fromWords: vi.fn(),
  },
}))

describe('lnurl.ts', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fetchMock: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let originalFetch: any

  beforeEach(() => {
    // Store original fetch
    originalFetch = globalThis.fetch
    // Create new mock for each test
    fetchMock = vi.fn()
    globalThis.fetch = fetchMock

    // Clear all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore original fetch
    globalThis.fetch = originalFetch
  })

  function createDecodedLnurl(words: number[]): Decoded {
    return {
      prefix: 'lnurl',
      words,
    }
  }

  describe('requestInvoice', () => {
    it('should successfully request an invoice', async () => {
      const mockLnurl = 'lnurl1test'
      const mockCallbackUrl = 'https://example.com/callback'
      const mockInvoice = 'lnbc1000n1p0test'

      // Import bech32 to get the mocked version
      const { bech32 } = await import('bech32')

      // Mock bech32 decoding
      vi.mocked(bech32.decode).mockReturnValue(createDecodedLnurl([1, 2, 3, 4]))

      // Mock fromWords to return bytes that Buffer.from will convert
      vi.mocked(bech32.fromWords).mockReturnValue(
        Array.from('https://example.com', (c) => c.charCodeAt(0)),
      )

      // Mock first fetch for LNURL params
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => ({
            contents: JSON.stringify({
              tag: 'payRequest',
              callback: mockCallbackUrl,
              minSendable: 1000,
              maxSendable: 100000000,
            }),
          }),
        })
        // Mock second fetch for invoice request
        .mockResolvedValueOnce({
          ok: true,
          json: () => ({
            contents: JSON.stringify({
              pr: mockInvoice,
            }),
          }),
        })

      const result = await requestInvoice(mockLnurl, 1000)

      expect(result).toBe(mockInvoice)
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('should throw error when LNURL params return ERROR status', async () => {
      const mockLnurl = 'lnurl1test'

      const { bech32 } = await import('bech32')
      vi.mocked(bech32.decode).mockReturnValue(createDecodedLnurl([1, 2, 3]))
      vi.mocked(bech32.fromWords).mockReturnValue(
        Array.from('https://example.com', (c) => c.charCodeAt(0)),
      )

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => ({
          status: 'ERROR',
          reason: 'Service unavailable',
          contents: JSON.stringify({}),
        }),
      })

      await expect(requestInvoice(mockLnurl, 1000)).rejects.toThrow(
        'LNURL error: Service unavailable',
      )
    })

    it('should throw error when tag is not payRequest', async () => {
      const mockLnurl = 'lnurl1test'

      const { bech32 } = await import('bech32')
      vi.mocked(bech32.decode).mockReturnValue(createDecodedLnurl([1, 2, 3]))
      vi.mocked(bech32.fromWords).mockReturnValue(
        Array.from('https://example.com', (c) => c.charCodeAt(0)),
      )

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => ({
          contents: JSON.stringify({
            tag: 'withdrawRequest',
            callback: 'https://example.com/callback',
            k1: 'withdraw-secret',
            minWithdrawable: 1000,
            maxWithdrawable: 100000,
          }),
        }),
      })

      await expect(requestInvoice(mockLnurl, 1000)).rejects.toThrow(
        'LNURL is not a valid payRequest',
      )
    })

    it('should throw error when invoice is missing in callback response', async () => {
      const mockLnurl = 'lnurl1test'
      const mockCallbackUrl = 'https://example.com/callback'

      const { bech32 } = await import('bech32')
      vi.mocked(bech32.decode).mockReturnValue(createDecodedLnurl([1, 2, 3]))
      vi.mocked(bech32.fromWords).mockReturnValue(
        Array.from('https://example.com', (c) => c.charCodeAt(0)),
      )

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => ({
            contents: JSON.stringify({
              tag: 'payRequest',
              callback: mockCallbackUrl,
            }),
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => ({
            contents: JSON.stringify({
              status: 'OK',
            }),
          }),
        })

      await expect(requestInvoice(mockLnurl, 1000)).rejects.toThrow('Error creating invoice')
    })

    it('should convert satoshis to millisatoshis correctly', async () => {
      const mockLnurl = 'lnurl1test'
      const mockCallbackUrl = 'https://example.com/callback'
      const mockInvoice = 'lnbc5000n1p0test'
      const amountSat = 5000

      const { bech32 } = await import('bech32')
      vi.mocked(bech32.decode).mockReturnValue(createDecodedLnurl([1, 2, 3]))
      vi.mocked(bech32.fromWords).mockReturnValue(
        Array.from('https://example.com', (c) => c.charCodeAt(0)),
      )

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => ({
            contents: JSON.stringify({
              tag: 'payRequest',
              callback: mockCallbackUrl,
            }),
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => ({
            contents: JSON.stringify({
              pr: mockInvoice,
            }),
          }),
        })

      await requestInvoice(mockLnurl, amountSat)

      // Check that the second fetch was called with the correct amount in millisatoshis
      const secondFetchCall = fetchMock.mock.calls[1]
      expect(secondFetchCall?.[0]).toContain('amount=5000000') // 5000 sat * 1000 = 5000000 msat
    })

    it('should throw error when callback returns error', async () => {
      const mockLnurl = 'lnurl1test'
      const mockCallbackUrl = 'https://example.com/callback'

      const { bech32 } = await import('bech32')
      vi.mocked(bech32.decode).mockReturnValue(createDecodedLnurl([1, 2, 3]))
      vi.mocked(bech32.fromWords).mockReturnValue(
        Array.from('https://example.com', (c) => c.charCodeAt(0)),
      )

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: () => ({
            contents: JSON.stringify({
              tag: 'payRequest',
              callback: mockCallbackUrl,
            }),
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => ({
            error: 'Amount too high',
            contents: JSON.stringify({}),
          }),
        })

      await expect(requestInvoice(mockLnurl, 1000)).rejects.toThrow(
        'Invoice error: Amount too high',
      )
    })
  })

  describe('resolveLnurl', () => {
    it('should resolve withdraw request params', async () => {
      const mockLnurl = 'lnurl1withdraw'
      const { bech32 } = await import('bech32')
      vi.mocked(bech32.decode).mockReturnValue(createDecodedLnurl([1, 2, 3]))
      vi.mocked(bech32.fromWords).mockReturnValue(
        Array.from('https://example.com/withdraw', (c) => c.charCodeAt(0)),
      )

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => ({
          contents: JSON.stringify({
            tag: 'withdrawRequest',
            callback: 'https://example.com/callback',
            k1: 'withdraw-secret',
            defaultDescription: 'ATM withdrawal',
            minWithdrawable: 1000,
            maxWithdrawable: 100000,
          }),
        }),
      })

      await expect(resolveLnurl(mockLnurl)).resolves.toEqual({
        tag: 'withdrawRequest',
        callback: 'https://example.com/callback',
        k1: 'withdraw-secret',
        defaultDescription: 'ATM withdrawal',
        minWithdrawable: 1000,
        maxWithdrawable: 100000,
      })
    })
  })

  describe('submitLnurlWithdrawInvoice', () => {
    it('should submit a local invoice to the withdraw callback', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => ({
          contents: JSON.stringify({ status: 'OK' }),
        }),
      })

      await submitLnurlWithdrawInvoice(
        {
          tag: 'withdrawRequest',
          callback: 'https://example.com/callback',
          k1: 'withdraw-secret',
          defaultDescription: 'ATM withdrawal',
          minWithdrawable: 1000,
          maxWithdrawable: 100000,
        },
        'lnbc100n1test',
      )

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock.mock.calls[0]?.[0]).toContain('k1=withdraw-secret')
      expect(fetchMock.mock.calls[0]?.[0]).toContain('pr=lnbc100n1test')
    })

    it('should throw callback errors from withdraw requests', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => ({
          contents: JSON.stringify({
            status: 'ERROR',
            reason: 'Invoice already used',
          }),
        }),
      })

      await expect(
        submitLnurlWithdrawInvoice(
          {
            tag: 'withdrawRequest',
            callback: 'https://example.com/callback',
            k1: 'withdraw-secret',
            defaultDescription: 'ATM withdrawal',
            minWithdrawable: 1000,
            maxWithdrawable: 100000,
          },
          'lnbc100n1test',
        ),
      ).rejects.toThrow('LNURL withdraw error: Invoice already used')
    })
  })
})
