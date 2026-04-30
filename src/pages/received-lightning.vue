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
import { useRoute } from 'vue-router'
import SuccessResultLayout from 'src/components/SuccessResultLayout.vue'
import { useFormatters } from '../utils/formatter'
import { getQueryInteger } from 'src/utils/routeQuery'

const { formatNumber } = useFormatters()
const route = useRoute('/received-lightning')

const amount = ref(getQueryInteger(route.query.amount))
</script>
