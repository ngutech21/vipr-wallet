<template>
  <div class="transaction-content q-pa-md">
    <section class="transaction-card transaction-card--summary">
      <div class="amount-section text-center">
        <div class="amount-value text-h4" :class="getAmountClass()">
          {{ getAmountPrefix() }}{{ amountInSats }}
        </div>
        <div class="amount-fiat">≈ ${{ amountInFiat }} USD</div>
      </div>

      <div class="summary-row">
        <div class="transaction-type">
          <q-icon :name="getTransactionIcon()" :color="getTransactionColor()" size="2rem" />
          <div class="summary-meta">
            <span class="summary-title">
              {{ getTransactionLabel() }}
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
        <div v-if="transaction.txId" class="detail-row detail-row--separated">
          <div class="label">Transaction ID</div>
          <div class="value value--transaction-id text-caption">{{ transaction.txId }}</div>
        </div>
      </div>
    </section>

    <section v-if="transaction.notes" class="transaction-card">
      <div class="detail-row">
        <div class="label">Notes</div>
        <q-btn
          flat
          dense
          round
          icon="content_copy"
          @click="copyNotes"
          class="copy-button"
          data-testid="ecash-transaction-details-copy-notes-btn"
        />
      </div>

      <div class="notes-section q-mt-sm">
        <div class="notes-container">
          <div class="notes-text text-caption">{{ transaction.notes }}</div>
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
import type { EcashTransaction } from '@fedimint/core'
import { logger } from 'src/services/logger'

interface Props {
  transaction: EcashTransaction
}

const props = defineProps<Props>()

const federationStore = useFederationStore()
const lightningStore = useLightningStore()
const notify = useAppNotify()
const amountInFiat = ref<string>('0.00')

const amountInSats = computed(() => {
  return Math.floor(props.transaction.amountMsats / 1000).toLocaleString()
})

const federationTitle = computed(() => {
  return federationStore.selectedFederation?.title ?? 'Unknown Federation'
})

onMounted(async () => {
  try {
    const sats = Math.floor(props.transaction.amountMsats / 1000)
    const fiatValue = await lightningStore.satsToFiat(sats)
    amountInFiat.value = fiatValue.toFixed(2)
  } catch (error) {
    logger.error('Failed to convert amount to fiat', error)
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
  return props.transaction.type === 'spend_oob' ? '-' : '+'
}

function formatDate(timestamp: number): string {
  return date.formatDate(timestamp, 'MMMM D, YYYY - h:mm A')
}

function formatOutcome(outcome: string | undefined): string {
  if (outcome == null || outcome === '') return ''
  return outcome.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}

function getStatusColor(status: string | undefined): string {
  if (status == null || status === '') return 'grey'

  switch (status.toLowerCase()) {
    case 'success':
    case 'done':
      return 'positive'
    case 'created':
    case 'issuing':
      return 'warning'
    case 'usercanceledfailure':
    case 'refunded':
      return 'negative'
    default:
      return 'grey'
  }
}

async function copyNotes() {
  if (props.transaction.notes != null && props.transaction.notes !== '') {
    try {
      await navigator.clipboard.writeText(props.transaction.notes)
      notify.success('Notes copied to clipboard')
    } catch (error) {
      logger.error('Failed to copy ecash notes to clipboard', error)
      notify.error('Failed to copy notes')
    }
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
  padding: 18px;
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
  gap: 10px;
  min-width: 0;
  flex-wrap: nowrap;
}

.status-badge {
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
  padding: 14px 0;

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

  .value--transaction-id {
    flex: 1 1 auto;
    max-width: none;
    min-width: 0;
    text-align: right;
    white-space: nowrap;
    word-break: normal;
    overflow-x: auto;
    overflow-y: hidden;
    font-family: monospace;
    scrollbar-width: thin;
  }
}

.copy-button {
  color: rgba(255, 255, 255, 0.78);
}

.notes-section {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 18px;
  padding: 14px 16px;

  .notes-container {
    max-height: 80px;
    overflow-y: auto;

    .notes-text {
      word-break: break-all;
      font-family: monospace;
    }
  }
}

/* Dark mode adjustments */
.body--dark {
  .notes-section {
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
