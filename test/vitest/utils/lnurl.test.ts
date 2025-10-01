import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { requestInvoice } from 'src/utils/lnurl'

// Mock bech32 module at the top level
vi.mock('bech32', () => ({
  bech32: {
    decode: vi.fn(),
    fromWords: vi.fn(),
  },
}))

describe('lnurl.ts', () => {
  let fetchMock: any
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

  describe('requestInvoice', () => {
    it('should successfully request an invoice', async () => {
      const mockLnurl = 'lnurl1test'
      const mockCallbackUrl = 'https://example.com/callback'
      const mockInvoice = 'lnbc1000n1p0test'

      // Import bech32 to get the mocked version
      const { bech32 } = await import('bech32')

      // Mock bech32 decoding
      vi.mocked(bech32.decode).mockReturnValue({
        prefix: 'lnurl',
        words: [1, 2, 3, 4],
      } as any)

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
      vi.mocked(bech32.decode).mockReturnValue({
        prefix: 'lnurl',
        words: [1, 2, 3],
      } as any)
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
      vi.mocked(bech32.decode).mockReturnValue({
        prefix: 'lnurl',
        words: [1, 2, 3],
      } as any)
      vi.mocked(bech32.fromWords).mockReturnValue(
        Array.from('https://example.com', (c) => c.charCodeAt(0)),
      )

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => ({
          contents: JSON.stringify({
            tag: 'withdrawRequest',
            callback: 'https://example.com/callback',
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
      vi.mocked(bech32.decode).mockReturnValue({
        prefix: 'lnurl',
        words: [1, 2, 3],
      } as any)
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
      vi.mocked(bech32.decode).mockReturnValue({
        prefix: 'lnurl',
        words: [1, 2, 3],
      } as any)
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
      // URL is encoded, so check for encoded version of amount=5000000
      expect(secondFetchCall?.[0]).toContain('amount%3D5000000') // 5000 sat * 1000 = 5000000 msat
    })

    it('should throw error when callback returns error', async () => {
      const mockLnurl = 'lnurl1test'
      const mockCallbackUrl = 'https://example.com/callback'

      const { bech32 } = await import('bech32')
      vi.mocked(bech32.decode).mockReturnValue({
        prefix: 'lnurl',
        words: [1, 2, 3],
      } as any)
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
})
