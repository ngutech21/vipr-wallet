import { computed, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCopyShare } from 'src/composables/useCopyShare'

const mockShare = vi.hoisted(() => vi.fn())
const notifyMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}))
const shareState = vi.hoisted(() => ({
  isSupported: { value: true },
}))

vi.mock('@vueuse/core', () => ({
  useShare: () => ({
    share: mockShare,
    isSupported: shareState.isSupported,
  }),
}))

vi.mock('src/composables/useAppNotify', () => ({
  useAppNotify: () => notifyMock,
}))

describe('useCopyShare', () => {
  const clipboardWriteText = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    shareState.isSupported.value = true
    clipboardWriteText.mockResolvedValue(undefined)
    mockShare.mockResolvedValue(undefined)

    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: {
        writeText: clipboardWriteText,
      },
      configurable: true,
    })
  })

  it('copies the configured value and shows an optional success notification', async () => {
    const value = ref('lnbc123')
    const { copyToClipboard } = useCopyShare({
      value,
      copySuccessMessage: 'Invoice copied',
      copySuccessOptions: { timeout: 1000 },
    })

    await copyToClipboard()

    expect(clipboardWriteText).toHaveBeenCalledWith('lnbc123')
    expect(notifyMock.success).toHaveBeenCalledWith('Invoice copied', { timeout: 1000 })
  })

  it('reports copy failures through the configured callback and error message', async () => {
    const error = new Error('denied')
    const onCopyError = vi.fn()
    clipboardWriteText.mockRejectedValue(error)
    const { copyToClipboard } = useCopyShare({
      value: 'cashuA123',
      copyErrorMessage: (copyError) => `Failed: ${(copyError as Error).message}`,
      onCopyError,
    })

    await copyToClipboard()

    expect(onCopyError).toHaveBeenCalledWith(error)
    expect(notifyMock.error).toHaveBeenCalledWith('Failed: denied')
  })

  it('uses native share when available', async () => {
    const amount = ref(25)
    const { shareValue } = useCopyShare({
      value: 'cashuA123',
      shareTitle: computed(() => `Ecash for ${amount.value} sats`),
    })

    await shareValue()

    expect(mockShare).toHaveBeenCalledWith({
      title: 'Ecash for 25 sats',
      text: 'cashuA123',
    })
    expect(clipboardWriteText).not.toHaveBeenCalled()
  })

  it('falls back to clipboard when native share is unavailable', async () => {
    shareState.isSupported.value = false
    const { shareValue } = useCopyShare({
      value: 'bc1qexample',
      shareTitle: 'Bitcoin address',
      shareUnavailableMessage: 'Address copied. Share is not available in this browser.',
    })

    await shareValue()

    expect(mockShare).not.toHaveBeenCalled()
    expect(clipboardWriteText).toHaveBeenCalledWith('bc1qexample')
    expect(notifyMock.info).toHaveBeenCalledWith(
      'Address copied. Share is not available in this browser.',
    )
  })
})
