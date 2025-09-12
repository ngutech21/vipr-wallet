<route lang="yaml">
meta:
  hideBottomNav: true
</route>

<template>
  <q-page class="page-container">
    <canvas id="confetti-canvas" class="confetti-canvas"></canvas>

    <div class="content-container q-pa-md">
      <q-btn
        flat
        round
        color="white"
        icon="close"
        class="absolute-top-right q-ma-md"
        :to="{ name: '/' }"
      />

      <div class="success-icon-container">
        <q-icon name="check_circle" size="4em" color="positive" />
      </div>
      <div class="text-h4 text-weight-bold q-mt-lg gradient-text">Payment Successful!</div>
      <q-card class="payment-card q-mt-lg q-pa-md">
        <div class="row justify-between items-center q-py-sm">
          <div class="text-subtitle1 text-weight-medium">Amount</div>
          <div class="text-h5 text-weight-bold">
            {{ formatNumber(amount) }} <span class="text-caption">sats</span>
          </div>
        </div>

        <q-separator class="q-my-sm opacity-4" />

        <div class="row justify-between items-center q-py-sm">
          <div class="text-subtitle1 text-weight-medium">Network Fee</div>
          <div class="text-subtitle1 text-weight-bold">
            {{ formatNumber(fee) }} <span class="text-caption">mSats</span>
          </div>
        </div>
      </q-card>
      <q-btn flat color="white" class="q-mt-xl" :to="{ name: '/' }" label="Back to Home" />
    </div>
  </q-page>
</template>

<script setup lang="ts">
defineOptions({
  name: 'SentLightningPage',
})

import { onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router/auto'
import JSConfetti from 'js-confetti'
import { useFormatters } from '../utils/formatter'

const { formatNumber } = useFormatters()
const route = useRoute()
const amount = ref(parseInt(route.query.amount as string) || 0)
const fee = ref(parseInt(route.query.fee as string) || 0)
let jsConfetti: JSConfetti | null = null
let animationInterval: number | null = null

onMounted(() => {
  jsConfetti = new JSConfetti({
    canvas: document.getElementById('confetti-canvas') as HTMLCanvasElement,
  })

  // Initial celebration
  jsConfetti.addConfetti({
    emojis: ['⚡', '₿', '✨'],
    emojiSize: 70,
    confettiNumber: 80,
  }).catch(() => {
    // Ignore confetti errors
  })

  // Periodic small bursts
  animationInterval = window.setInterval(() => {
    jsConfetti?.addConfetti({
      emojis: ['⚡', '₿', '✨'],
      emojiSize: 50,
      confettiNumber: 20,
    }).catch(() => {
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
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif,
    'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
  position: relative;
  background: linear-gradient(145deg, var(--q-primary) 0%, #8000ff 100%);
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
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  z-index: 2;
}

/* Make text more visible */
.text-white {
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.payment-card {
  width: 100%;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
.success-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  max-width: 400px;
  margin: 0 auto;
}
</style>
