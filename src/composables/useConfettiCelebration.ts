import { onMounted, onUnmounted, type Ref } from 'vue'

type ConfettiCelebrationOptions = {
  emojis?: string[]
  initialEmojiSize?: number
  initialConfettiNumber?: number
  burstEmojiSize?: number
  burstConfettiNumber?: number
  burstIntervalMs?: number
  stopAfterMs?: number
}

type JSConfettiInstance = {
  addConfetti(options: {
    emojis: string[]
    emojiSize: number
    confettiNumber: number
  }): Promise<unknown>
}

export function useConfettiCelebration(
  canvasRef: Ref<HTMLCanvasElement | null>,
  options: ConfettiCelebrationOptions = {},
) {
  let jsConfetti: JSConfettiInstance | null = null
  let animationInterval: number | null = null
  let isUnmounted = false

  const emojis = options.emojis ?? ['⚡', '₿', '✨']
  const initialEmojiSize = options.initialEmojiSize ?? 70
  const initialConfettiNumber = options.initialConfettiNumber ?? 80
  const burstEmojiSize = options.burstEmojiSize ?? 50
  const burstConfettiNumber = options.burstConfettiNumber ?? 20
  const burstIntervalMs = options.burstIntervalMs ?? 500
  const stopAfterMs = options.stopAfterMs ?? 2_000

  function stopBursts() {
    if (animationInterval != null) {
      clearInterval(animationInterval)
      animationInterval = null
    }
  }

  onMounted(async () => {
    if (canvasRef.value == null) {
      return
    }

    try {
      const { default: JSConfetti } = await import('js-confetti')

      if (isUnmounted || canvasRef.value == null) {
        return
      }

      jsConfetti = new JSConfetti({
        canvas: canvasRef.value,
      })

      jsConfetti
        .addConfetti({
          emojis,
          emojiSize: initialEmojiSize,
          confettiNumber: initialConfettiNumber,
        })
        .catch(() => {
          // Ignore confetti errors; celebration is decorative.
        })
    } catch {
      // Ignore module loading errors; celebration is decorative.
      return
    }

    animationInterval = window.setInterval(() => {
      jsConfetti
        ?.addConfetti({
          emojis,
          emojiSize: burstEmojiSize,
          confettiNumber: burstConfettiNumber,
        })
        .catch(() => {
          // Ignore confetti errors; celebration is decorative.
        })
    }, burstIntervalMs)

    window.setTimeout(stopBursts, stopAfterMs)
  })

  onUnmounted(() => {
    isUnmounted = true
    stopBursts()
    jsConfetti = null
  })
}
