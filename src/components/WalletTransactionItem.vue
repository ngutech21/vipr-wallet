<template>
  <q-item
    clickable
    v-ripple
    class="transaction-item"
    @click="$emit('click', transaction.operationId)"
  >
    <q-item-section avatar>
      <q-icon
        :name="transaction.type === 'withdraw' ? 'arrow_upward' : 'arrow_downward'"
        :color="transaction.type === 'withdraw' ? 'negative' : 'positive'"
        size="md"
      />
    </q-item-section>

    <q-item-section>
      <q-item-label>{{ transaction.type === 'withdraw' ? 'Withdrawn' : 'Deposited' }}</q-item-label>
      <q-item-label caption>{{
        date.formatDate(transaction.timestamp, 'MMMM D, YYYY - h:mm A')
      }}</q-item-label>
      <q-item-label caption class="text-grey-6">
        {{ formatAddress(transaction.onchainAddress) }}
      </q-item-label>
      <q-item-label
        caption
        v-if="transaction.outcome && transaction.outcome !== 'Confirmed'"
        class="text-orange"
      >
        Status: {{ formatOutcome(transaction.outcome) }}
      </q-item-label>
    </q-item-section>

    <q-item-section side>
      <div
        class="transaction-amount"
        :class="transaction.type === 'withdraw' ? 'text-negative' : 'text-positive'"
      >
        {{ transaction.type === 'withdraw' ? '- ' : '+ ' }}
        {{ amountInSats }} sats
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
import { computed } from 'vue'
import { date } from 'quasar'
import { useLightningStore } from 'src/stores/lightning'
import type { WalletTransaction } from '@fedimint/core-web'

interface Props {
  transaction: WalletTransaction
}

const props = defineProps<Props>()

defineEmits<{
  click: [operationId: string]
}>()

const lightningStore = useLightningStore()

const amountInSats = computed(() => {
  return Math.floor(props.transaction.amountMsats / 1000).toLocaleString()
})

const feeInSats = computed(() => {
  return Math.floor(props.transaction.fee / 1000).toLocaleString()
})

async function amountInFiat(amountMsats: number): Promise<string> {
  const sats = Math.floor(amountMsats / 1000)
  const fiatValue = await lightningStore.satsToFiat(sats)
  return fiatValue.toFixed(2)
}

function formatAddress(address: string): string {
  if (address.length <= 16) return address
  return `${address.slice(0, 8)}...${address.slice(-8)}`
}

function formatOutcome(outcome: string): string {
  return outcome.replace(/([A-Z])/g, ' $1').trim()
}
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
