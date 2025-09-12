<template>
  <div class="transaction-content q-pa-md">
    <!-- Amount section -->
    <div class="amount-section text-center q-py-lg">
      <div class="text-h4 text-weight-bold" :class="getAmountClass()">
        {{ getAmountPrefix() }}{{ amountInSats }}
      </div>
      <div class="text-caption text-grey">≈ ${{ amountInFiat }} USD</div>
    </div>

    <!-- Transaction type and status badge -->
    <div class="row items-center justify-between q-mb-lg">
      <div class="transaction-type">
        <q-icon
          :name="getTransactionIcon()"
          :color="getTransactionColor()"
          size="2rem"
          class="q-mr-sm"
        />
        <span class="text-subtitle1">
          {{ getTransactionLabel() }}
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

    <!-- Transaction ID -->
    <q-separator class="q-my-md" v-if="transaction.txId" />
    <div v-if="transaction.txId" class="detail-row">
      <div class="label">Transaction ID</div>
      <div class="value text-caption">{{ transaction.txId }}</div>
    </div>

    <!-- Notes section if available -->
    <q-separator class="q-my-md" v-if="transaction.notes" />
    <div v-if="transaction.notes" class="detail-row">
      <div class="label">Notes</div>
      <q-btn flat dense round icon="content_copy" @click="copyNotes" class="copy-button" />
    </div>

    <div v-if="transaction.notes" class="notes-section q-mt-sm">
      <div class="notes-container">
        <div class="notes-text text-caption">{{ transaction.notes }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { date, Notify } from 'quasar'
import { useFederationStore } from 'src/stores/federation'
import { useLightningStore } from 'src/stores/lightning'
import type { EcashTransaction } from '@fedimint/core-web'
import { logger } from 'src/services/logger'

interface Props {
  transaction: EcashTransaction
}

const props = defineProps<Props>()

const federationStore = useFederationStore()
const lightningStore = useLightningStore()
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
      Notify.create({
        message: 'Notes copied to clipboard',
        color: 'positive',
        position: 'top',
      })
    } catch (error) {
      logger.error('Failed to copy ecash notes to clipboard', error)
      Notify.create({
        message: 'Failed to copy notes',
        color: 'negative',
        position: 'top',
      })
    }
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

.notes-section {
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  padding: 12px;

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
    background-color: rgba(255, 255, 255, 0.1);
  }
}
</style>
