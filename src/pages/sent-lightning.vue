<route lang="yaml">
meta:
  hideBottomNav: true
</route>

<template>
  <SuccessResultLayout
    page-class="page-container--lightning"
    close-test-id="sent-lightning-close-btn"
    home-test-id="sent-lightning-back-home-btn"
    :close-to="{ name: '/' }"
    title="Payment sent"
    :amount-text="`${formatNumber(amount)} sats`"
    subtitle="Your Lightning payment was completed."
    show-confetti
  >
    <template #summary>
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
    </template>
  </SuccessResultLayout>
</template>

<script setup lang="ts">
defineOptions({
  name: 'SentLightningPage',
})

import { ref } from 'vue'
import { useRoute, type LocationQueryValue } from 'vue-router'
import SuccessResultLayout from 'src/components/SuccessResultLayout.vue'
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
</script>
