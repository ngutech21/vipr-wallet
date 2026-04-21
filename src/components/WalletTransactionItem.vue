<template>
  <q-item
    clickable
    v-ripple
    class="transaction-item"
    @click="$emit('click', transaction.operationId)"
    :data-testid="`wallet-transaction-item-${transaction.operationId}`"
  >
    <q-item-section avatar>
      <div class="transaction-icon-shell">
        <q-icon
          :name="transaction.type === 'withdraw' ? 'arrow_upward' : 'arrow_downward'"
          :color="transaction.type === 'withdraw' ? 'negative' : 'positive'"
          size="md"
        />
      </div>
    </q-item-section>

    <q-item-section>
      <q-item-label class="transaction-title-row">
        <span class="transaction-title">{{ transactionTitle }}</span>
        <q-badge rounded :color="statusColor" text-color="white" class="transaction-status-badge">
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
        :class="transaction.type === 'withdraw' ? 'text-negative' : 'text-positive'"
      >
        <template v-if="amountInSats != null">
          {{ transaction.type === 'withdraw' ? '- ' : '+ ' }}
          {{ amountInSats }} sats
        </template>
        <template v-else>Unknown</template>
      </div>
      <div class="transaction-fiat">≈ ${{ amountInFiat }} usd</div>
    </q-item-section>

    <q-item-section side>
      <q-icon name="chevron_right" color="grey-6" />
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { date } from 'quasar'
import { useLightningStore } from 'src/stores/lightning'
import type { WalletTransaction } from '@fedimint/core'
import { logger } from 'src/services/logger'
import {
  getWalletTransactionAmountSats,
  getWalletTransactionFeeSats,
  getWalletTransactionListTitle,
  getWalletTransactionStatusLabel,
  getWalletTransactionStatusColor,
} from 'src/utils/walletTransactionPresentation'

interface Props {
  transaction: WalletTransaction
}

const props = defineProps<Props>()

defineEmits<{
  click: [operationId: string]
}>()

const lightningStore = useLightningStore()
const amountInFiat = ref('0.00')
const transactionTitle = computed(() => getWalletTransactionListTitle(props.transaction))
const statusLabel = computed(() => getWalletTransactionStatusLabel(props.transaction) ?? 'Unknown')
const statusColor = computed(() => getWalletTransactionStatusColor(statusLabel.value))
const formattedTimestamp = computed(() => {
  return date.formatDate(props.transaction.timestamp, 'MMM D, YYYY • h:mm A')
})

const amountInSats = computed(() => {
  const amountSats = getWalletTransactionAmountSats(props.transaction)
  return amountSats != null ? amountSats.toLocaleString() : null
})

const feeInSats = computed(() => {
  return getWalletTransactionFeeSats(props.transaction).toLocaleString()
})
const showFeeMeta = computed(() => {
  return props.transaction.type === 'withdraw' && getWalletTransactionFeeSats(props.transaction) > 0
})

watch(
  () => props.transaction.amountMsats,
  async (amountMsats) => {
    try {
      const sats = getWalletTransactionAmountSats({
        ...props.transaction,
        amountMsats,
      })
      if (sats == null) {
        amountInFiat.value = '0.00'
        return
      }
      const fiatValue = await lightningStore.satsToFiat(sats)
      amountInFiat.value = fiatValue.toFixed(2)
    } catch (error) {
      logger.error('Failed to convert wallet amount to fiat', error)
      amountInFiat.value = '0.00'
    }
  },
  { immediate: true },
)
</script>

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
