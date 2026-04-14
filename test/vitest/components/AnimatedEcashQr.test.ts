import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AnimatedEcashQr from 'src/components/AnimatedEcashQr.vue'
import { ECASH_QR_FRAME_INTERVAL_MS } from 'src/utils/ecashQrFrames'

describe('AnimatedEcashQr.vue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function createWrapper(notes: string) {
    return mount(AnimatedEcashQr, {
      props: { notes },
      global: {
        stubs: {
          'qrcode-vue': {
            props: {
              value: { type: String, required: true },
            },
            template: '<div data-testid="animated-ecash-qr-code" :data-value="value" />',
          },
        },
      },
    })
  }

  it('renders nothing for empty notes', () => {
    const wrapper = createWrapper('')

    expect(wrapper.find('[data-testid="animated-ecash-qr"]').exists()).toBe(false)
  })

  it('shows a single QR frame for small payloads', () => {
    const wrapper = createWrapper('small-notes')

    expect(wrapper.get('[data-testid="animated-ecash-qr-code"]').attributes('data-value')).not.toBe(
      '',
    )
    expect(wrapper.find('[data-testid="animated-ecash-qr-frame-indicator"]').exists()).toBe(false)
  })

  it('rotates through multiple QR frames for larger payloads', async () => {
    const wrapper = createWrapper('fed1offline-test-notes-'.repeat(20))
    const qrCode = wrapper.get('[data-testid="animated-ecash-qr-code"]')
    const firstFrame = qrCode.attributes('data-value')

    await vi.advanceTimersByTimeAsync(ECASH_QR_FRAME_INTERVAL_MS)

    expect(wrapper.find('[data-testid="animated-ecash-qr-frame-indicator"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="animated-ecash-qr-code"]').attributes('data-value')).not.toBe(
      firstFrame,
    )
  })
})
