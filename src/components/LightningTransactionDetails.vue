<template>
  <div class="transaction-content">
    <section class="transaction-card transaction-card--summary">
      <div class="amount-section">
        <div
          class="amount-value"
          :class="transaction.type === 'send' ? 'text-negative' : 'text-positive'"
        >
          {{ transaction.type === 'receive' ? '+' : '-' }}{{ amountInSats }}
        </div>
        <div class="amount-fiat">≈ ${{ amountInFiat }} USD</div>
      </div>

      <div class="summary-row">
        <div class="transaction-type">
          <q-icon
            :name="transaction.type === 'send' ? 'arrow_upward' : 'arrow_downward'"
            :color="transaction.type === 'send' ? 'negative' : 'positive'"
            size="2rem"
          />
          <div class="summary-meta">
            <span class="summary-title">
              {{ transaction.type === 'send' ? 'Sent Lightning' : 'Received Lightning' }}
            </span>

            <q-badge
              :color="getStatusColor(transaction.outcome)"
              class="status-badge"
              v-if="transaction.outcome"
            >
              {{ formatOutcome(transaction.outcome) }}
            </q-badge>
          </div>
        </div>
      </div>
    </section>

    <section class="transaction-card transaction-card--details">
      <div class="detail-stack">
        <div class="detail-row">
          <div class="label">Created on</div>
          <div class="value">{{ formatDate(transaction.timestamp) }}</div>
        </div>
        <div class="detail-row detail-row--separated">
          <div class="label">Federation</div>
          <div class="value">{{ federationTitle }}</div>
        </div>
        <div class="detail-row detail-row--separated">
          <div class="label">Gateway</div>
          <div class="value">{{ transaction.gateway }}</div>
        </div>
        <div
          v-if="transaction.type === 'send' && transaction.fee"
          class="detail-row detail-row--separated"
        >
          <div class="label">Fee</div>
          <div class="value">{{ Math.round(transaction.fee / 1000) }} sats</div>
        </div>
        <div class="detail-row detail-row--separated">
          <div class="label">Transaction ID</div>
          <div class="value value--transaction-id">{{ transaction.txId }}</div>
        </div>
        <div v-if="transaction.preimage" class="detail-row detail-row--separated">
          <div class="label">Preimage</div>
          <div class="value value--transaction-id">{{ transaction.preimage }}</div>
        </div>
        <div class="detail-row detail-row--separated detail-row--block">
          <div class="detail-row__heading">
            <div class="label">Lightning Invoice</div>
            <q-btn
              flat
              dense
              round
              icon="content_copy"
              @click="copyInvoice"
              class="copy-button"
              data-testid="lightning-transaction-details-copy-invoice-btn"
            />
          </div>

          <div class="invoice-section">
            <div class="invoice-container">
              <div class="invoice-text">{{ transaction.invoice }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { date } from 'quasar'
import { useAppNotify } from 'src/composables/useAppNotify'
import { useFederationStore } from 'src/stores/federation'
import { useLightningStore } from 'src/stores/lightning'
import type { LightningTransaction } from '@fedimint/core'
import { logger } from 'src/services/logger'

interface Props {
  transaction: LightningTransaction
}

const props = defineProps<Props>()

const federationStore = useFederationStore()
const lightningStore = useLightningStore()
const notify = useAppNotify()
const amountInFiat = ref<string>('0.00')

const amountInSats = computed(() => {
  try {
    const invoice = lightningStore.decodeInvoice(props.transaction.invoice)
    return invoice.amount.toLocaleString()
  } catch (error) {
    logger.error('Failed to decode Lightning invoice', error)
    return '0'
  }
})

const federationTitle = computed(() => {
  return federationStore.selectedFederation?.title ?? 'Unknown Federation'
})

onMounted(async () => {
  try {
    const invoice = lightningStore.decodeInvoice(props.transaction.invoice)
    const fiatValue = await lightningStore.satsToFiat(invoice.amount)
    amountInFiat.value = fiatValue.toFixed(2)
  } catch (error) {
    logger.error('Failed to convert amount to fiat', error)
    amountInFiat.value = '0.00'
  }
})

function formatDate(timestamp: number): string {
  return date.formatDate(timestamp, 'MMMM D, YYYY - h:mm A')
}

function formatOutcome(outcome: string): string {
  return outcome.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
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
    notify.success('Invoice copied to clipboard')
  } catch (error) {
    logger.error('Failed to copy Lightning invoice to clipboard', error)
    notify.error('Failed to copy invoice')
  }
}
</script>
