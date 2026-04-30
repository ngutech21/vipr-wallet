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
import { useRoute } from 'vue-router'
import SuccessResultLayout from 'src/components/SuccessResultLayout.vue'
import { useFormatters } from '../utils/formatter'
import { getQueryInteger } from 'src/utils/routeQuery'

const { formatNumber } = useFormatters()
const route = useRoute('/sent-lightning')

const amount = ref(getQueryInteger(route.query.amount))
const fee = ref(getQueryInteger(route.query.fee))
</script>
