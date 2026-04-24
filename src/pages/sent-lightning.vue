<route lang="yaml">
meta:
  hideBottomNav: true
</route>

<template>
  <q-page class="page-container">
    <canvas id="confetti-canvas" class="confetti-canvas"></canvas>

    <div class="content-container">
      <q-btn
        flat
        round
        color="white"
        icon="close"
        class="success-close-btn"
        :to="{ name: '/' }"
        data-testid="sent-lightning-close-btn"
      />

      <div class="success-shell">
        <div class="success-icon">
          <q-icon name="check_circle" size="3.5em" color="positive" />
        </div>
        <div class="success-title">Payment sent</div>
        <div class="success-amount q-mt-md">{{ formatNumber(amount) }} sats</div>
        <div class="success-subtitle q-mt-sm">Your Lightning payment was completed.</div>

        <q-card flat class="success-card q-mt-xl">
          <q-card-section class="summary-row">
            <span class="summary-label">Amount</span>
            <span class="summary-value">{{ formatNumber(amount) }} sats</span>
          </q-card-section>
          <q-separator dark inset />
          <q-card-section class="summary-row">
            <span class="summary-label">Network fee</span>
            <span class="summary-value">{{ formatNumber(fee) }} mSats</span>
          </q-card-section>
        </q-card>

        <q-btn
          color="primary"
          class="success-action-btn q-mt-xl"
          :to="{ name: '/' }"
          label="Back to home"
          data-testid="sent-lightning-back-home-btn"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
defineOptions({
  name: 'SentLightningPage',
})

import { onMounted, onUnmounted, ref } from 'vue'
import { useRoute, type LocationQueryValue } from 'vue-router'
import JSConfetti from 'js-confetti'
import { useFormatters } from '../utils/formatter'

const { formatNumber } = useFormatters()
const route = useRoute('/sent-lightning')

function getQueryNumber(value: LocationQueryValue | LocationQueryValue[] | undefined): number {
  const firstValue = Array.isArray(value) ? value[0] : value
  if (typeof firstValue !== 'string') {
    return 0
  }

  const parsed = Number.parseInt(firstValue, 10)
  return Number.isNaN(parsed) ? 0 : parsed
}

const amount = ref(getQueryNumber(route.query.amount))
const fee = ref(getQueryNumber(route.query.fee))
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
  top: calc(16px + env(safe-area-inset-top));
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

.success-amount {
  font-size: 2.75rem;
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
