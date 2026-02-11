<template>
  <q-item
    v-if="hasValidOutcome"
    clickable
    v-ripple
    class="transaction-item"
    @click="$emit('click', transaction.operationId)"
    :data-testid="`lightning-transaction-item-${transaction.operationId}`"
  >
    <q-item-section avatar>
      <q-icon
        :name="transaction.type === 'send' ? 'arrow_upward' : 'arrow_downward'"
        :color="transaction.type === 'send' ? 'negative' : 'positive'"
        size="md"
      />
    </q-item-section>

    <q-item-section>
      <q-item-label>{{
        transaction.type === 'send' ? 'Sent Lightning' : 'Received Lightning'
      }}</q-item-label>
      <q-item-label caption>{{
        date.formatDate(transaction.timestamp, 'MMMM D, YYYY - h:mm A')
      }}</q-item-label>
      <q-item-label caption v-if="transaction.outcome !== 'success'" class="text-orange">
        Status: {{ formatOutcome(transaction.outcome) }}
      </q-item-label>
    </q-item-section>

    <q-item-section side>
      <div
        class="transaction-amount"
        :class="transaction.type === 'send' ? 'text-negative' : 'text-positive'"
      >
        {{ transaction.type === 'send' ? '- ' : '+ ' }}
        {{ amountInSats }} sats
      </div>
      <div class="text-caption text-grey">≈ ${{ amountInFiat }} {{ 'usd' }}</div>
      <div v-if="transaction.fee" class="text-caption text-grey">
        Fee: {{ transaction.fee }} sats
      </div>
    </q-item-section>

    <q-item-section side>
      <q-icon name="chevron_right" color="grey-6" />
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { date } from 'quasar'
import { useLightningStore } from 'src/stores/lightning'
import type { LightningTransaction } from '@fedimint/core'
import { logger } from 'src/services/logger'

interface Props {
  transaction: LightningTransaction
}

const props = defineProps<Props>()

defineEmits<{
  click: [operationId: string]
}>()

const lightningStore = useLightningStore()
const amountInFiat = ref<string>('0.00')

const hasValidOutcome = computed(() => {
  return Boolean(props.transaction.outcome?.trim())
})
const amountInSats = computed(() => {
  try {
    const invoice = lightningStore.decodeInvoice(props.transaction.invoice)
    return invoice.amount.toLocaleString()
  } catch (error) {
    logger.error('Failed to decode Lightning invoice', error)
    return '0'
  }
})

onMounted(async () => {
  logger.lightning.debug('Lightning transaction item mounted', {
    invoice: `${props.transaction.invoice.substring(0, 20)}...`,
  })
  try {
    const invoice = lightningStore.decodeInvoice(props.transaction.invoice)
    const sats = Math.floor(invoice.amount / 1000)
    const fiatValue = await lightningStore.satsToFiat(sats)
    amountInFiat.value = fiatValue.toFixed(2)
  } catch (error) {
    logger.error('Failed to convert Lightning amount to fiat', error)
    amountInFiat.value = '0.00'
  }
})

function formatOutcome(outcome: string | undefined): string {
  if (outcome == null || outcome === '') return ''
  return outcome.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}
</script>

// ...existing code...

<style scoped>
.transaction-item {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  margin-bottom: 4px;
  padding-left: 0px;
  padding-right: 0px;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }

  &:active {
    background-color: rgba(255, 255, 255, 0.08);
  }
}

.transaction-amount {
  font-weight: 500;
  text-align: right;
}
</style>
