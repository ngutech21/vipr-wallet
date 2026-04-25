<route lang="yaml">
meta:
  hideBottomNav: true
</route>

<template>
  <q-page class="page-container page-container--lightning">
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
        <div class="success-amount">{{ formatNumber(amount) }} sats</div>
        <div class="success-subtitle">Your Lightning payment was completed.</div>

        <q-card flat class="success-card">
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
          no-caps
          unelevated
          class="success-action-btn vipr-btn vipr-btn--primary vipr-btn--lg"
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
