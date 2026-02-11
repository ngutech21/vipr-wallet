<template>
  <q-item
    clickable
    v-ripple
    class="transaction-item"
    @click="$emit('click', transaction.operationId)"
    :data-testid="`ecash-transaction-item-${transaction.operationId}`"
  >
    <q-item-section avatar>
      <q-icon :name="getTransactionIcon()" :color="getTransactionColor()" size="md" />
    </q-item-section>

    <q-item-section>
      <q-item-label>{{ getTransactionLabel() }}</q-item-label>
      <q-item-label caption>{{
        date.formatDate(transaction.timestamp, 'MMMM D, YYYY - h:mm A')
      }}</q-item-label>
      <q-item-label caption v-if="transaction.outcome" class="text-orange">
        Status: {{ formatOutcome(transaction.outcome) }}
      </q-item-label>
    </q-item-section>

    <q-item-section side>
      <div class="transaction-amount" :class="getAmountClass()">
        {{ getAmountPrefix() }}
        {{ amountInSats }} sats
      </div>
      <div class="text-caption text-grey">≈ ${{ amountInFiat }} {{ 'usd' }}</div>
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
import type { EcashTransaction } from '@fedimint/core'
import { logger } from 'src/services/logger'

interface Props {
  transaction: EcashTransaction
}

const props = defineProps<Props>()

defineEmits<{
  click: [operationId: string]
}>()

const lightningStore = useLightningStore()
const amountInFiat = ref<string>('0.00')

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
  return props.transaction.type === 'spend_oob' ? '- ' : ''
}

function formatOutcome(outcome: string): string {
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
