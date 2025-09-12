<template>
  <div class="transaction-content q-pa-md">
    <!-- Amount section -->
    <div class="amount-section text-center q-py-lg">
      <div
        class="text-h4 text-weight-bold"
        :class="transaction.type === 'withdraw' ? 'text-negative' : 'text-positive'"
      >
        {{ transaction.type === 'deposit' ? '+' : '-' }}{{ amountInSats }}
      </div>
      <div class="text-caption text-grey">≈ ${{ amountInFiat }} USD</div>
    </div>

    <!-- Transaction type and status badge -->
    <div class="row items-center justify-between q-mb-lg">
      <div class="transaction-type">
        <q-icon
          :name="transaction.type === 'withdraw' ? 'arrow_upward' : 'arrow_downward'"
          :color="transaction.type === 'withdraw' ? 'negative' : 'positive'"
          size="2rem"
          class="q-mr-sm"
        />
        <span class="text-subtitle1">
          {{ transaction.type === 'withdraw' ? 'Withdrawn' : 'Deposited' }}
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

    <!-- Bitcoin Address -->
    <q-separator class="q-my-md" />
    <div class="detail-row">
      <div class="label">Bitcoin Address</div>
      <q-btn flat dense round icon="content_copy" @click="copyAddress" class="copy-button" />
    </div>

    <div class="address-section q-mt-sm">
      <div class="address-container">
        <div class="address-text text-caption">{{ transaction.onchainAddress }}</div>
      </div>
    </div>

    <!-- Fee -->
    <q-separator class="q-my-md" />
    <div class="detail-row">
      <div class="label">Network Fee</div>
      <div class="value">{{ feeInSats }} sats</div>
    </div>

    <!-- Net Amount -->
    <q-separator class="q-my-md" />
    <div class="detail-row">
      <div class="label">
        {{ transaction.type === 'withdraw' ? 'Net Withdrawn' : 'Net Deposited' }}
      </div>
      <div
        class="value"
        :class="transaction.type === 'withdraw' ? 'text-negative' : 'text-positive'"
      >
        {{ transaction.type === 'withdraw' ? '-' : '+' }}{{ netAmountInSats }} sats
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { date, Notify } from 'quasar'
import { useFederationStore } from 'src/stores/federation'
import { useLightningStore } from 'src/stores/lightning'
import type { WalletTransaction } from '@fedimint/core-web'
import { logger } from 'src/services/logger'

interface Props {
  transaction: WalletTransaction
}

const props = defineProps<Props>()

const federationStore = useFederationStore()
const lightningStore = useLightningStore()
const amountInFiat = ref<string>('0.00')

const amountInSats = computed(() => {
  return Math.floor(props.transaction.amountMsats / 1000).toLocaleString()
})

const feeInSats = computed(() => {
  return Math.floor(props.transaction.fee / 1000).toLocaleString()
})

const netAmountInSats = computed(() => {
  const amount = Math.floor(props.transaction.amountMsats / 1000)
  const fee = Math.floor(props.transaction.fee / 1000)
  const netAmount = props.transaction.type === 'withdraw' ? amount + fee : amount - fee
  return Math.abs(netAmount).toLocaleString()
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

function formatDate(timestamp: number): string {
  return date.formatDate(timestamp, 'MMMM D, YYYY - h:mm A')
}

function formatOutcome(outcome: string): string {
  return outcome.replace(/([A-Z])/g, ' $1').trim()
}

function getStatusColor(status: string | undefined): string {
  if (status == null || status === '') return 'grey'

  switch (status) {
    case 'Confirmed':
    case 'Claimed':
      return 'positive'
    case 'WaitingForTransaction':
    case 'WaitingForConfirmation':
      return 'warning'
    case 'Failed':
      return 'negative'
    default:
      return 'grey'
  }
}

async function copyAddress() {
  try {
    await navigator.clipboard.writeText(props.transaction.onchainAddress)
    Notify.create({
      message: 'Address copied to clipboard',
      color: 'positive',
      position: 'top',
    })
  } catch (error) {
    logger.error('Failed to copy address to clipboard', error)
    Notify.create({
      message: 'Failed to copy address',
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

.address-section {
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  padding: 12px;

  .address-container {
    max-height: 80px;
    overflow-y: auto;

    .address-text {
      word-break: break-all;
      font-family: monospace;
    }
  }
}

/* Dark mode adjustments */
.body--dark {
  .address-section {
    background-color: rgba(255, 255, 255, 0.1);
  }
}
</style>
