<template>
  <q-item
    clickable
    v-ripple
    class="transaction-item"
    @click="$emit('click', transaction.operationId)"
    :data-testid="`lightning-transaction-item-${transaction.operationId}`"
  >
    <q-item-section avatar>
      <TransactionRailIcon
        rail="lightning"
        :direction="transaction.type === 'send' ? 'send' : 'receive'"
      />
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
import TransactionRailIcon from 'src/components/TransactionRailIcon.vue'

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
  const restoredAmountSats = getLightningTransactionAmountSats(props.transaction)
  if (restoredAmountSats != null) {
    return restoredAmountSats.toLocaleString()
  }

  if (props.transaction.invoice.trim() === '') {
    return '0'
  }

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
    const restoredAmountSats = getLightningTransactionAmountSats(props.transaction)
    if (restoredAmountSats == null && props.transaction.invoice.trim() === '') {
      amountInFiat.value = '0.00'
      return
    }

    const amountSats =
      restoredAmountSats ?? lightningStore.decodeInvoice(props.transaction.invoice).amount
    const fiatValue = await lightningStore.satsToFiat(amountSats)
    amountInFiat.value = fiatValue.toFixed(2)
  } catch (error) {
    logger.error('Failed to convert Lightning amount to fiat', error)
    amountInFiat.value = '0.00'
  }
})

function getLightningTransactionAmountSats(transaction: LightningTransaction): number | null {
  const amountMsats = (transaction as LightningTransaction & { amountMsats?: unknown }).amountMsats
  return typeof amountMsats === 'number' && Number.isFinite(amountMsats) && amountMsats > 0
    ? Math.floor(amountMsats / 1_000)
    : null
}
</script>
