<template>
  <q-item
    clickable
    v-ripple
    class="transaction-item"
    @click="$emit('click', transaction.operationId)"
    :data-testid="`ecash-transaction-item-${transaction.operationId}`"
  >
    <q-item-section avatar>
      <div class="transaction-icon-shell">
        <q-icon :name="getTransactionIcon()" :color="getTransactionColor()" size="md" />
      </div>
    </q-item-section>

    <q-item-section>
      <q-item-label class="transaction-title">{{ getTransactionLabel() }}</q-item-label>
      <q-item-label caption class="transaction-meta">
        {{ formattedTimestamp }}
      </q-item-label>
    </q-item-section>

    <q-item-section side>
      <div class="transaction-amount" :class="getAmountClass()">
        {{ getAmountPrefix() }}
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
import type { EcashTransaction } from '@fedimint/core'
import { logger } from 'src/services/logger'
import { formatTransactionListTimestamp } from 'src/utils/formatter'

interface Props {
  transaction: EcashTransaction
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
  return Math.floor(props.transaction.amountMsats / 1000).toLocaleString()
})

onMounted(async () => {
  try {
    const sats = Math.floor(props.transaction.amountMsats / 1000)
    const fiatValue = await lightningStore.satsToFiat(sats)
    amountInFiat.value = fiatValue.toFixed(2)
  } catch (error) {
    logger.error('Failed to convert ecash amount to fiat', error)
    amountInFiat.value = '0.00'
  }
})

function getTransactionIcon(): string {
  switch (props.transaction.type) {
    case 'spend_oob':
      return 'arrow_upward'
    case 'reissue':
      return 'arrow_downward'
    default:
      return 'account_balance_wallet'
  }
}

function getTransactionColor(): string {
  switch (props.transaction.type) {
    case 'spend_oob':
      return 'negative'
    case 'reissue':
      return 'positive'
    default:
      return 'primary'
  }
}

function getTransactionLabel(): string {
  switch (props.transaction.type) {
    case 'spend_oob':
      return 'Sent Ecash'
    case 'reissue':
      return 'Received Ecash'
    default:
      return 'Ecash Transaction'
  }
}

function getAmountClass(): string {
  return props.transaction.type === 'spend_oob' ? 'text-negative' : 'text-positive'
}

function getAmountPrefix(): string {
  return props.transaction.type === 'spend_oob' ? '- ' : '+ '
}
</script>
