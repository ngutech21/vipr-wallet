<template>
  <q-item
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
      <q-item-label class="transaction-title">
        {{ transaction.type === 'send' ? 'Sent Lightning' : 'Received Lightning' }}
      </q-item-label>
      <q-item-label caption class="transaction-meta">
        {{ formattedTimestamp }}
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
import { useLightningStore } from 'src/stores/lightning'
import type { LightningTransaction } from '@fedimint/core'
import { logger } from 'src/services/logger'
import { formatTransactionListTimestamp } from 'src/utils/formatter'

interface Props {
  transaction: LightningTransaction
  compactTimestamp?: boolean
}

const props = defineProps<Props>()

defineEmits<{
  click: [operationId: string]
}>()

const lightningStore = useLightningStore()
const amountInFiat = ref<string>('0.00')
const formattedTimestamp = computed(() => {
  return formatTransactionListTimestamp(props.transaction.timestamp, props.compactTimestamp)
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

.transaction-title {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
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
