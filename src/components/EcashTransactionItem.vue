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
      <q-item-label class="transaction-title-row">
        <span class="transaction-title">{{ getTransactionLabel() }}</span>
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
const formattedTimestamp = computed(() => {
  return date.formatDate(props.transaction.timestamp, 'MMM D, YYYY • h:mm A')
})
const statusLabel = computed(() => {
  return props.transaction.outcome != null ? formatOutcome(props.transaction.outcome) : null
})
const statusColor = computed(() => {
  if (props.transaction.outcome == null) {
    return 'grey'
  }

  switch (props.transaction.outcome) {
    case 'Done':
    case 'Success':
      return 'positive'
    case 'Created':
    case 'Issuing':
    case 'UserCanceledProcessing':
      return 'warning'
    case 'UserCanceledFailure':
      return 'negative'
    case 'Refunded':
    case 'UserCanceledSuccess':
      return 'grey'
    default:
      return 'grey'
  }
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

function formatOutcome(outcome: string): string {
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
