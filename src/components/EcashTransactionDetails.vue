<template>
  <div class="transaction-content">
    <section class="transaction-card transaction-card--summary">
      <div class="amount-section">
        <div class="amount-value" :class="getAmountClass()">
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
        <div v-if="transaction.txId" class="detail-row detail-row--separated">
          <div class="label">Transaction ID</div>
          <div class="value value--transaction-id">{{ transaction.txId }}</div>
        </div>
        <div v-if="transaction.notes" class="detail-row detail-row--separated detail-row--block">
          <div class="detail-row__heading">
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

          <div class="notes-section">
            <div class="notes-container">
              <div class="notes-text">{{ transaction.notes }}</div>
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
