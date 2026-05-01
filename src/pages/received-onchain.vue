<route lang="yaml">
meta:
  hideBottomNav: true
</route>

<template>
  <SuccessResultLayout
    page-class="page-container--onchain"
    page-test-id="received-onchain-page"
    success-test-id="received-onchain-success-state"
    close-test-id="received-onchain-close-btn"
    title-test-id="received-onchain-title"
    amount-test-id="received-onchain-amount"
    home-test-id="received-onchain-back-home-btn"
    :close-to="{ name: '/' }"
    title="Bitcoin received"
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
  name: 'ReceivedOnchainPage',
})

import { ref } from 'vue'
import { useRoute } from 'vue-router'
import SuccessResultLayout from 'src/components/SuccessResultLayout.vue'
import { useFormatters } from 'src/utils/formatter'
import { getQueryInteger } from 'src/utils/routeQuery'

const { formatNumber } = useFormatters()
const route = useRoute('/received-onchain')
const amount = ref(getQueryInteger(route.query.amount))
</script>
