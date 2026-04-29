import { onMounted, onUnmounted, type Ref } from 'vue'
import JSConfetti from 'js-confetti'

type ConfettiCelebrationOptions = {
  emojis?: string[]
  initialEmojiSize?: number
  initialConfettiNumber?: number
  burstEmojiSize?: number
  burstConfettiNumber?: number
  burstIntervalMs?: number
  stopAfterMs?: number
}

export function useConfettiCelebration(
  canvasRef: Ref<HTMLCanvasElement | null>,
  options: ConfettiCelebrationOptions = {},
) {
  let jsConfetti: JSConfetti | null = null
  let animationInterval: number | null = null

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

  onMounted(() => {
    if (canvasRef.value == null) {
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
    stopBursts()
    jsConfetti = null
  })
}
