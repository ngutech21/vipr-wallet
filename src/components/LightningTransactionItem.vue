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
      <div class="transaction-icon-shell">
        <q-icon
          :name="transaction.type === 'send' ? 'arrow_upward' : 'arrow_downward'"
          :color="transaction.type === 'send' ? 'negative' : 'positive'"
          size="md"
        />
      </div>
    </q-item-section>

    <q-item-section>
      <q-item-label class="transaction-title-row">
        <span class="transaction-title">
          {{ transaction.type === 'send' ? 'Sent Lightning' : 'Received Lightning' }}
        </span>
        <q-badge
          v-if="statusLabel != null"
          rounded
          :color="statusColor"
          text-color="white"
          class="transaction-status-badge"
        >
          {{ statusLabel }}
        </q-badge>
      </q-item-label>
      <q-item-label caption class="transaction-meta">
        {{ formattedTimestamp }}
        <template v-if="showFeeMeta"> • Fee {{ feeInSats }} sats</template>
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
      <div class="transaction-fiat">≈ ${{ amountInFiat }} usd</div>
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
const formattedTimestamp = computed(() => {
  return date.formatDate(props.transaction.timestamp, 'MMM D, YYYY • h:mm A')
})

const hasValidOutcome = computed(() => {
  return Boolean(props.transaction.outcome?.trim())
})
const statusLabel = computed(() => {
  return props.transaction.outcome != null ? formatOutcome(props.transaction.outcome) : null
})
const statusColor = computed(() => {
  if (props.transaction.outcome == null) {
    return 'grey'
  }

  switch (props.transaction.outcome) {
    case 'success':
    case 'claimed':
    case 'funded':
      return 'positive'
    case 'created':
    case 'pending':
    case 'awaiting_funds':
    case 'canceled':
      return 'warning'
    case 'unexpected_error':
      return 'negative'
    default:
      return 'grey'
  }
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
const feeInSats = computed(() => Math.round((props.transaction.fee ?? 0) / 1000).toLocaleString())
const showFeeMeta = computed(() => {
  return props.transaction.type === 'send' && (props.transaction.fee ?? 0) > 0
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
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  margin-bottom: 2px;
  padding: 10px 0;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }

  &:active {
    background-color: rgba(255, 255, 255, 0.08);
  }
}

.transaction-icon-shell {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.05);
}

.transaction-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.transaction-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.transaction-status-badge {
  flex-shrink: 0;
}

.transaction-meta {
  margin-top: 4px;
  color: rgba(255, 255, 255, 0.54);
}

.transaction-amount {
  font-weight: 600;
  text-align: right;
  white-space: nowrap;
}

.transaction-fiat {
  margin-top: 4px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.48);
  text-align: right;
}
</style>
