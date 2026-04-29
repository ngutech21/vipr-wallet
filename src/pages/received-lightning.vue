<route lang="yaml">
meta:
  hideBottomNav: true
</route>

<template>
  <SuccessResultLayout
    page-class="page-container--lightning"
    page-test-id="received-lightning-page"
    success-test-id="received-lightning-success-state"
    close-test-id="received-lightning-close-btn"
    title-test-id="received-lightning-title"
    amount-test-id="received-lightning-amount"
    home-test-id="back-home-button"
    :close-to="{ name: '/' }"
    title="Payment received"
    :amount-text="`${formatNumber(amount)} sats`"
    subtitle="The funds are now available in your wallet."
    show-confetti
  >
    <template #summary>
      <q-card flat class="success-card">
        <q-card-section class="summary-row">
          <span class="summary-label">Amount</span>
          <span class="summary-value">{{ formatNumber(amount) }} sats</span>
        </q-card-section>
      </q-card>
    </template>
  </SuccessResultLayout>
</template>

<script setup lang="ts">
defineOptions({
  name: 'ReceivedLightningPage',
})

import { ref } from 'vue'
import { useRoute, type LocationQueryValue } from 'vue-router'
import SuccessResultLayout from 'src/components/SuccessResultLayout.vue'
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
</script>
