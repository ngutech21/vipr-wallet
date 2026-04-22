<route lang="yaml">
meta:
  hideBottomNav: true
</route>

<template>
  <q-page class="page-container" data-testid="received-lightning-page">
    <canvas id="confetti-canvas" class="confetti-canvas"></canvas>

    <div class="content-container">
      <q-btn
        flat
        round
        color="white"
        icon="close"
        class="success-close-btn"
        :to="{ name: '/' }"
        data-testid="received-lightning-close-btn"
      />

      <div class="success-shell" data-testid="received-lightning-success-state">
        <div class="success-icon">
          <q-icon name="check_circle" size="3.5em" color="positive" />
        </div>

        <div class="success-title" data-testid="received-lightning-title">Payment received</div>
        <div class="success-amount text-h3 q-mt-md" data-testid="received-lightning-amount">
          {{ formatNumber(amount) }} sats
        </div>
        <div class="success-subtitle q-mt-sm">The funds are now available in your wallet.</div>

        <q-btn
          color="primary"
          class="success-action-btn q-mt-xl"
          :to="{ name: '/' }"
          label="Back to home"
          data-testid="back-home-button"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
defineOptions({
  name: 'ReceivedLightningPage',
})

import { onMounted, onUnmounted, ref } from 'vue'
import { useRoute, type LocationQueryValue } from 'vue-router'
import JSConfetti from 'js-confetti'
import { useFormatters } from '../utils/formatter'

const { formatNumber } = useFormatters()
const route = useRoute('/received-lightning')

function getQueryNumber(value: LocationQueryValue | LocationQueryValue[] | undefined): number {
  const firstValue = Array.isArray(value) ? value[0] : value
  if (typeof firstValue !== 'string') {
    return 0
  }

  const parsed = Number.parseInt(firstValue, 10)
  return Number.isNaN(parsed) ? 0 : parsed
}

const amount = ref(getQueryNumber(route.query.amount))
let jsConfetti: JSConfetti | null = null
let animationInterval: number | null = null

onMounted(() => {
  jsConfetti = new JSConfetti({
    canvas: document.getElementById('confetti-canvas') as HTMLCanvasElement,
  })

  // Initial celebration
  jsConfetti
    .addConfetti({
      emojis: ['⚡', '₿', '✨'],
      emojiSize: 70,
      confettiNumber: 80,
    })
    .catch(() => {
      // Ignore confetti errors
    })

  // Periodic small bursts
  animationInterval = window.setInterval(() => {
    jsConfetti
      ?.addConfetti({
        emojis: ['⚡', '₿', '✨'],
        emojiSize: 50,
        confettiNumber: 20,
      })
      .catch(() => {
        // Ignore confetti errors
      })
  }, 500)

  // Stop periodic bursts after 2 seconds
  setTimeout(() => {
    if (animationInterval != null) {
      clearInterval(animationInterval)
      animationInterval = null
    }
  }, 2000)
})

onUnmounted(() => {
  if (animationInterval != null) {
    clearInterval(animationInterval)
  }
  jsConfetti = null
})
</script>

<style scoped>
.page-container {
  position: relative;
  background:
    radial-gradient(circle at top left, rgba(128, 0, 255, 0.22), transparent 36%),
    linear-gradient(180deg, #171717 0%, #121212 100%);
  min-height: 100vh;
  overflow: hidden;
}

.confetti-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.content-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  z-index: 2;
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
  padding: 24px 16px;
}

.success-close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.success-shell {
  width: 100%;
  max-width: 560px;
  text-align: center;
  color: white;
}

.success-icon {
  margin-bottom: 12px;
}

.success-title {
  font-size: 1.9rem;
  font-weight: 700;
}

.success-subtitle {
  color: #b3b3b3;
}

.success-card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.025));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  color: white;
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.summary-label {
  color: #9e9e9e;
}

.summary-value {
  font-weight: 600;
}

.success-action-btn {
  width: 100%;
  min-height: 54px;
  border-radius: 18px;
}
</style>
