<template>
  <q-item
    clickable
    v-ripple
    class="transaction-item"
    @click="$emit('click', transaction.operationId)"
    :data-testid="`wallet-transaction-item-${transaction.operationId}`"
  >
    <q-item-section avatar>
      <q-icon
        :name="transaction.type === 'withdraw' ? 'arrow_upward' : 'arrow_downward'"
        :color="transaction.type === 'withdraw' ? 'negative' : 'positive'"
        size="md"
      />
    </q-item-section>

    <q-item-section>
      <q-item-label>{{ transactionTitle }}</q-item-label>
      <q-item-label caption>{{
        date.formatDate(transaction.timestamp, 'MMMM D, YYYY - h:mm A')
      }}</q-item-label>
      <q-item-label caption :class="statusColorClass"> Status: {{ statusLabel }} </q-item-label>
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
      <div class="text-caption text-grey">≈ ${{ amountInFiat }} {{ 'usd' }}</div>
      <div class="text-caption text-grey">Fee: {{ feeInSats }} sats</div>
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
const statusColorClass = computed(() => {
  if (props.transaction.type === 'withdraw') {
    return props.transaction.outcome === 'Failed' ? 'text-negative' : 'text-orange'
  }

  return 'text-orange'
})

const amountInSats = computed(() => {
  const amountSats = getWalletTransactionAmountSats(props.transaction)
  return amountSats != null ? amountSats.toLocaleString() : null
})

const feeInSats = computed(() => {
  return getWalletTransactionFeeSats(props.transaction).toLocaleString()
})

watch(
  () => props.transaction.amountMsats,
  async (amountMsats) => {
    try {
      const sats = getWalletTransactionAmountSats({
        ...props.transaction,
        amountMsats,
      } as WalletTransaction)
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
