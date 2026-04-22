<template>
  <div class="transaction-content q-pa-md">
    <section class="transaction-card transaction-card--summary">
      <div class="amount-section text-center">
        <div
          class="amount-value text-h4"
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
              class="status-badge q-pa-sm text-caption"
              v-if="transaction.outcome"
            >
              {{ formatOutcome(transaction.outcome) }}
            </q-badge>
          </div>
        </div>
      </div>
    </section>

    <section class="transaction-card">
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
          <div class="value text-caption">{{ transaction.txId }}</div>
        </div>
      </div>
    </section>

    <section v-if="transaction.preimage" class="transaction-card">
      <div class="detail-stack">
        <div class="detail-row">
          <div class="label">Preimage</div>
          <div class="value text-caption">{{ transaction.preimage }}</div>
        </div>
      </div>
    </section>

    <section class="transaction-card">
      <div class="detail-row detail-row--header">
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
      </div>

      <div class="invoice-section q-mt-sm">
        <div class="invoice-container">
          <div class="invoice-text text-caption">{{ transaction.invoice }}</div>
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

<style lang="scss" scoped>
.transaction-content {
  max-width: 700px;
  margin: 0 auto;
}

.transaction-card {
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  padding: 14px 18px 18px;
  margin-bottom: 16px;
}

.transaction-card--summary {
  background:
    radial-gradient(circle at top left, rgba(156, 39, 255, 0.14), transparent 42%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03));
}

.transaction-type {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.summary-meta {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  flex-wrap: nowrap;
}

.status-badge {
  color: rgba(0, 0, 0, 0.82);
  border-radius: 999px;
  padding: 4px 10px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.amount-section {
  padding: 8px 0 18px;
}

.amount-value {
  font-size: clamp(2.4rem, 6vw, 3rem);
  line-height: 1.05;
  font-weight: 700;
  margin: 0;
}

.amount-fiat {
  margin-top: 6px;
  color: rgba(255, 255, 255, 0.52);
  font-size: 0.95rem;
}

.summary-title {
  font-size: 1.35rem;
  font-weight: 600;
  white-space: nowrap;
}

.summary-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.detail-stack {
  display: grid;
  gap: 0;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 12px 0;

  &--separated {
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .label {
    font-size: 0.82rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    color: rgba(255, 255, 255, 0.6);
  }

  .value {
    font-weight: 500;
    max-width: 70%;
    word-break: break-all;
    text-align: right;
  }
}

.detail-row--header {
  justify-content: flex-start;
  padding-top: 4px;
  padding-bottom: 8px;
}

.detail-row__heading {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.copy-button {
  color: rgba(255, 255, 255, 0.78);
}

.invoice-section {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 18px;
  padding: 14px 16px;

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
    background-color: rgba(255, 255, 255, 0.08);
  }
}

@media (max-width: 599px) {
  .summary-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .detail-row {
    flex-direction: column;
    align-items: flex-start;

    .value {
      max-width: 100%;
      text-align: left;
    }
  }
}
</style>
