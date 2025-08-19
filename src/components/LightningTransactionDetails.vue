<template>
  <div class="transaction-content q-pa-md">
    <!-- Amount section -->
    <div class="amount-section text-center q-py-lg">
      <div
        class="text-h4 text-weight-bold"
        :class="transaction.type === 'send' ? 'text-negative' : 'text-positive'"
      >
        {{ transaction.type === 'receive' ? '+' : '-' }}{{ amountInSats }}
      </div>
      <div class="text-caption text-grey">
        ≈ ${{ amountInFiat }} USD
      </div>
    </div>

    <!-- Transaction type and status badge -->
    <div class="row items-center justify-between q-mb-lg">
      <div class="transaction-type">
        <q-icon
          :name="transaction.type === 'send' ? 'arrow_upward' : 'arrow_downward'"
          :color="transaction.type === 'send' ? 'negative' : 'positive'"
          size="2rem"
          class="q-mr-sm"
        />
        <span class="text-subtitle1">
          {{ transaction.type === 'send' ? 'Sent Lightning' : 'Received Lightning' }}
        </span>
      </div>

      <q-badge
        :color="getStatusColor(transaction.outcome)"
        class="status-badge q-pa-sm text-caption"
        v-if="transaction.outcome"
      >
        {{ formatOutcome(transaction.outcome) }}
      </q-badge>
    </div>

    <!-- Time and date -->
    <q-separator class="q-my-md" />

    <div class="detail-row">
      <div class="label">Created on</div>
      <div class="value">{{ formatDate(transaction.timestamp) }}</div>
    </div>

    <!-- Federation -->
    <q-separator class="q-my-md" />
    <div class="detail-row">
      <div class="label">Federation</div>
      <div class="value">{{ federationTitle }}</div>
    </div>

    <!-- Gateway -->
    <q-separator class="q-my-md" />
    <div class="detail-row">
      <div class="label">Gateway</div>
      <div class="value">{{ transaction.gateway }}</div>
    </div>

    <!-- Fee for sent transactions -->
    <q-separator class="q-my-md" v-if="transaction.type === 'send' && transaction.fee" />
    <div v-if="transaction.type === 'send' && transaction.fee" class="detail-row">
      <div class="label">Fee</div>
      <div class="value">{{ Math.round(transaction.fee / 1000) }} sats</div>
    </div>

    <!-- Transaction ID -->
    <q-separator class="q-my-md" />
    <div class="detail-row">
      <div class="label">Transaction ID</div>
      <div class="value text-caption">{{ transaction.txId }}</div>
    </div>

    <!-- Payment Hash -->
    <q-separator class="q-my-md" v-if="transaction.preimage" />
    <div v-if="transaction.preimage" class="detail-row">
      <div class="label">Preimage</div>
      <div class="value text-caption">{{ transaction.preimage }}</div>
    </div>

    <!-- Lightning invoice section -->
    <q-separator class="q-my-md" />
    <div class="detail-row">
      <div class="label">Lightning Invoice</div>
      <q-btn
        flat
        dense
        round
        icon="content_copy"
        @click="copyInvoice"
        class="copy-button"
      />
    </div>

    <div class="invoice-section q-mt-sm">
      <div class="invoice-container">
        <div class="invoice-text text-caption">{{ transaction.invoice }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { date, Notify } from 'quasar'
import { useFederationStore } from 'src/stores/federation'
import { useLightningStore } from 'src/stores/lightning'
import type { LightningTransaction } from '@fedimint/core-web'

interface Props {
  transaction: LightningTransaction
}

const props = defineProps<Props>()

const federationStore = useFederationStore()
const lightningStore = useLightningStore()
const amountInFiat = ref<string>('0.00')

const amountInSats = computed(() => {
  try {
    const invoice = lightningStore.decodeInvoice(props.transaction.invoice)
    return invoice.amount.toLocaleString()
  } catch (error) {
    console.error('Failed to decode invoice:', error)
    return '0'
  }
})

const federationTitle = computed(() => {
  return federationStore.selectedFederation?.title || 'Unknown Federation'
})

onMounted(async () => {
  try {
    const invoice = lightningStore.decodeInvoice(props.transaction.invoice)
    const fiatValue = await lightningStore.satsToFiat(invoice.amount)
    amountInFiat.value = fiatValue.toFixed(2)
  } catch (error) {
    console.error('Failed to convert to fiat:', error)
    amountInFiat.value = '0.00'
  }
})

function formatDate(timestamp: number): string {
  return date.formatDate(timestamp, 'MMMM D, YYYY - h:mm A')
}

function formatOutcome(outcome: string): string {
  return outcome.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'claimed':
    case 'success':
    case 'funded':
      return 'positive'
    case 'created':
    case 'pending':
      return 'warning'
    case 'unexpected_error':
      return 'negative'
    default:
      return 'grey'
  }
}

async function copyInvoice() {
  try {
    await navigator.clipboard.writeText(props.transaction.invoice)
    Notify.create({
      message: 'Invoice copied to clipboard',
      color: 'positive',
      position: 'top',
    })
  } catch (error) {
    console.error('Failed to copy invoice:', error)
    Notify.create({
      message: 'Failed to copy invoice',
      color: 'negative',
      position: 'top',
    })
  }
}
</script>

<style lang="scss" scoped>
.transaction-content {
  max-width: 600px;
  margin: 0 auto;
}

.transaction-type {
  display: flex;
  align-items: center;
}

.status-badge {
  border-radius: 12px;
  padding: 4px 12px;
  font-weight: 500;
}

.amount-section {
  padding: 20px 0;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;

  .label {
    font-weight: 500;
    color: white;
  }

  .value {
    max-width: 80%;
    word-break: break-all;
  }
}

.invoice-section {
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  padding: 12px;

  .invoice-container {
    max-height: 80px;
    overflow-y: auto;

    .invoice-text {
      word-break: break-all;
      font-family: monospace;
    }
  }
}

/* Dark mode adjustments */
.body--dark {
  .invoice-section {
    background-color: rgba(255, 255, 255, 0.1);
  }
}
</style>
