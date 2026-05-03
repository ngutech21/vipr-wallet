<template>
  <div class="transaction-rail-icon" :class="`transaction-rail-icon--${rail}`" aria-hidden="true">
    <q-icon :name="railIcon" class="transaction-rail-icon__base" />
    <span
      class="transaction-rail-icon__badge"
      :class="`transaction-rail-icon__badge--${direction}`"
    >
      <q-icon :name="direction === 'send' ? 'arrow_upward' : 'arrow_downward'" />
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type PaymentRail = 'bitcoin' | 'lightning' | 'ecash'
type PaymentDirection = 'send' | 'receive'

const props = defineProps<{
  rail: PaymentRail
  direction: PaymentDirection
}>()

const railIcon = computed(() => {
  switch (props.rail) {
    case 'bitcoin':
      return 'currency_bitcoin'
    case 'lightning':
      return 'bolt'
    case 'ecash':
      return 'toll'
    default:
      return 'account_balance_wallet'
  }
})
</script>
