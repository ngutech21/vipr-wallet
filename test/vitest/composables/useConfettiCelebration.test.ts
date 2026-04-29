/* eslint-disable vue/one-component-per-file */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { useConfettiCelebration } from 'src/composables/useConfettiCelebration'

const addConfettiMock = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const jsConfettiConstructorMock = vi.hoisted(() =>
  vi.fn().mockImplementation(function JSConfettiMock() {
    return {
      addConfetti: addConfettiMock,
    }
  }),
)

vi.mock('js-confetti', () => ({
  default: jsConfettiConstructorMock,
}))

describe('useConfettiCelebration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does nothing when no canvas is available', async () => {
    const Harness = defineComponent({
      setup() {
        const canvas = ref<HTMLCanvasElement | null>(null)
        useConfettiCelebration(canvas)
      },
      template: '<div />',
    })

    mount(Harness)
    await flushPromises()

    expect(jsConfettiConstructorMock).not.toHaveBeenCalled()
  })

  it('starts bursts on mount and stops them on unmount', async () => {
    const Harness = defineComponent({
      setup() {
        const canvas = ref<HTMLCanvasElement | null>(null)
        useConfettiCelebration(canvas, {
          emojis: ['*'],
          initialEmojiSize: 10,
          initialConfettiNumber: 3,
          burstEmojiSize: 8,
          burstConfettiNumber: 1,
          burstIntervalMs: 100,
          stopAfterMs: 250,
        })
        return { canvas }
      },
      template: '<canvas ref="canvas" />',
    })

    const wrapper = mount(Harness)
    await flushPromises()

    expect(jsConfettiConstructorMock).toHaveBeenCalledTimes(1)
    expect(addConfettiMock).toHaveBeenCalledWith({
      emojis: ['*'],
      emojiSize: 10,
      confettiNumber: 3,
    })

    vi.advanceTimersByTime(100)

    expect(addConfettiMock).toHaveBeenCalledWith({
      emojis: ['*'],
      emojiSize: 8,
      confettiNumber: 1,
    })

    const callCountBeforeUnmount = addConfettiMock.mock.calls.length
    wrapper.unmount()
    vi.advanceTimersByTime(500)

    expect(addConfettiMock).toHaveBeenCalledTimes(callCountBeforeUnmount)
  })
})
