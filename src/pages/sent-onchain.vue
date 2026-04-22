<route lang="yaml">
meta:
  hideBottomNav: true
</route>

<template>
  <q-page class="page-container" data-testid="sent-onchain-page">
    <div class="content-container">
      <q-btn
        flat
        round
        color="white"
        icon="close"
        class="success-close-btn"
        @click="goHome"
        data-testid="sent-onchain-close-btn"
      />

      <div class="success-shell">
        <div class="success-icon">
          <q-icon :name="statusIcon" size="3.5em" :color="statusColor" />
        </div>
        <div class="success-title" data-testid="sent-onchain-title">{{ statusTitle }}</div>
        <div class="success-amount q-mt-md" data-testid="sent-onchain-amount-text">
          {{ formatNumber(displayAmount) }} sats
        </div>
        <div v-if="statusMessage" class="success-subtitle q-mt-sm">
          {{ statusMessage }}
        </div>

        <q-card flat class="success-card q-mt-xl">
          <q-card-section class="summary-row">
            <span class="summary-label">Status</span>
            <q-badge
              :color="statusColor"
              text-color="black"
              class="status-badge"
              data-testid="sent-onchain-status-text"
            >
              {{ statusText }}
            </q-badge>
          </q-card-section>

          <q-separator dark inset />

          <q-card-section class="summary-row">
            <span class="summary-label">Amount</span>
            <span class="summary-value">{{ formatNumber(displayAmount) }} sats</span>
          </q-card-section>

          <q-separator dark inset />

          <q-card-section class="summary-row summary-row--top">
            <span class="summary-label">Destination</span>
            <span class="summary-value summary-address" data-testid="sent-onchain-address-text">
              {{ displayAddress }}
            </span>
          </q-card-section>

          <template v-if="feeInSats > 0">
            <q-separator dark inset />

            <q-card-section class="summary-row">
              <span class="summary-label">Recorded fee</span>
              <span class="summary-value" data-testid="sent-onchain-fee-text">
                {{ formatNumber(feeInSats) }} sats
              </span>
            </q-card-section>
          </template>
        </q-card>

        <div class="success-actions q-mt-xl">
          <q-btn
            color="primary"
            class="success-action-btn"
            label="Back to home"
            @click="goHome"
            data-testid="sent-onchain-back-home-btn"
          />
          <q-btn
            v-if="transaction != null"
            flat
            color="white"
            class="success-secondary-btn q-mt-sm"
            label="View details"
            @click="viewTransaction"
            data-testid="sent-onchain-view-details-btn"
          />
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
defineOptions({
  name: 'SentOnchainPage',
})

import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { WalletTransaction } from '@fedimint/core'
import { logger } from 'src/services/logger'
import { useWalletStore } from 'src/stores/wallet'
import { useFormatters } from 'src/utils/formatter'

const MAX_POLL_ATTEMPTS = 10
const POLL_INTERVAL_MS = 3_000

const { formatNumber } = useFormatters()
const route = useRoute()
const router = useRouter()
const walletStore = useWalletStore()

const transaction = ref<WalletTransaction | null>(null)
const refreshAttempts = ref(0)

let pollTimeout: ReturnType<typeof setTimeout> | null = null

const operationId = getSingleQueryValue(route.query.operationId)
const submittedAddress = getSingleQueryValue(route.query.address)
const submittedAmount = getQueryNumber(route.query.amount)

const displayAddress = computed(() => {
  if (transaction.value?.onchainAddress != null && transaction.value.onchainAddress !== '') {
    return transaction.value.onchainAddress
  }

  if (submittedAddress !== '') {
    return submittedAddress
  }

  return 'Unknown'
})
const displayAmount = computed(() => {
  if (transaction.value != null && transaction.value.amountMsats > 0) {
    return Math.floor(transaction.value.amountMsats / 1_000)
  }

  return submittedAmount
})

const feeInSats = computed(() => {
  if (transaction.value == null) {
    return 0
  }

  return Math.max(0, Math.floor(transaction.value.fee / 1_000))
})

const hasTimedOut = computed(
  () => transaction.value == null && refreshAttempts.value >= MAX_POLL_ATTEMPTS,
)

const statusTitle = computed(() => {
  if (transaction.value?.outcome === 'Failed') {
    return 'Transfer failed'
  }

  if (transaction.value != null) {
    return 'Transfer submitted'
  }

  return 'Sending Bitcoin...'
})

const statusText = computed(() => {
  if (transaction.value?.outcome === 'Failed') {
    return 'Failed'
  }

  if (transaction.value?.outcome != null) {
    return transaction.value.outcome
  }

  if (transaction.value != null) {
    return 'Submitted'
  }

  return 'Pending'
})

const statusMessage = computed(() => {
  if (transaction.value?.outcome === 'Failed') {
    return 'The federation reported a failed onchain withdrawal. Check the transaction details.'
  }

  if (hasTimedOut.value) {
    return 'The transfer was submitted, but the wallet history has not refreshed yet. You can check again from the home screen later.'
  }

  if (transaction.value != null) {
    return 'The wallet recorded the withdrawal. Final onchain confirmation depends on the Bitcoin network.'
  }

  return 'Waiting for the wallet history to record this onchain transfer.'
})

const statusColor = computed(() => {
  if (transaction.value?.outcome === 'Failed') {
    return 'negative'
  }

  if (transaction.value != null) {
    return 'positive'
  }

  return 'warning'
})

const statusIcon = computed(() => {
  if (transaction.value?.outcome === 'Failed') {
    return 'error'
  }

  if (transaction.value != null) {
    return 'check_circle'
  }

  return 'schedule'
})

onMounted(() => {
  refreshTransaction().catch((error) => {
    logger.error('Failed to start onchain withdrawal refresh', error)
  })
})

onUnmounted(() => {
  if (pollTimeout != null) {
    clearTimeout(pollTimeout)
  }
})

async function refreshTransaction() {
  if (operationId === '' || refreshAttempts.value >= MAX_POLL_ATTEMPTS) {
    return
  }

  if (transaction.value != null && isTerminalOutcome(transaction.value.outcome)) {
    return
  }

  refreshAttempts.value += 1

  try {
    const transactions = await walletStore.getTransactions()
    const matchingTransaction = transactions.find(
      (item): item is WalletTransaction =>
        item.kind === 'wallet' && item.operationId === operationId,
    )

    if (matchingTransaction != null) {
      applyTransactionUpdate(matchingTransaction)
      await walletStore.updateBalance()

      if (isTerminalOutcome(matchingTransaction.outcome)) {
        return
      }
    }
  } catch (error) {
    logger.error('Failed to refresh onchain withdrawal transaction', error)
  }

  scheduleNextRefresh()
}

function scheduleNextRefresh() {
  if (
    refreshAttempts.value >= MAX_POLL_ATTEMPTS ||
    (transaction.value != null && isTerminalOutcome(transaction.value.outcome))
  ) {
    return
  }

  pollTimeout = setTimeout(() => {
    refreshTransaction().catch((error) => {
      logger.error('Failed to continue onchain withdrawal refresh', error)
    })
  }, POLL_INTERVAL_MS)
}

async function goHome() {
  await router.push({ name: '/' })
}

async function viewTransaction() {
  if (transaction.value == null) {
    return
  }

  await router.push({
    name: '/transaction/[id]',
    params: {
      id: transaction.value.operationId,
    },
  })
}

function getSingleQueryValue(value: unknown): string {
  const firstValue = Array.isArray(value) ? value[0] : value
  return typeof firstValue === 'string' ? firstValue : ''
}

function getQueryNumber(value: unknown): number {
  const rawValue = getSingleQueryValue(value)
  const parsedValue = Number.parseInt(rawValue, 10)
  return Number.isNaN(parsedValue) ? 0 : parsedValue
}

function applyTransactionUpdate(nextTransaction: WalletTransaction) {
  transaction.value = nextTransaction
}

function isTerminalOutcome(outcome: WalletTransaction['outcome'] | undefined): boolean {
  return outcome === 'Confirmed' || outcome === 'Claimed' || outcome === 'Failed'
}
</script>

<style scoped>
.page-container {
  position: relative;
  background:
    radial-gradient(circle at top left, rgba(29, 78, 216, 0.28), transparent 38%),
    linear-gradient(180deg, #171717 0%, #121212 100%);
  min-height: 100vh;
  overflow: hidden;
}

.content-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
  padding: 24px 16px;
}

.success-close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.success-shell {
  width: 100%;
  max-width: 560px;
  text-align: center;
  color: white;
}

.success-icon {
  margin-bottom: 12px;
}

.success-title {
  font-size: 1.9rem;
  font-weight: 700;
}

.success-amount {
  font-size: 2.75rem;
  font-weight: 700;
}

.success-subtitle {
  color: #b3b3b3;
}

.success-card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.025));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  color: white;
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.summary-row--top {
  align-items: flex-start;
}

.summary-label {
  color: #9e9e9e;
}

.summary-value {
  font-weight: 600;
}

.summary-address {
  max-width: 260px;
  word-break: break-word;
  text-align: right;
}

.status-badge {
  font-weight: 600;
  padding: 6px 10px;
  border-radius: 999px;
}

.success-actions {
  width: 100%;
}

.success-action-btn,
.success-secondary-btn {
  width: 100%;
  min-height: 54px;
  border-radius: 18px;
}
</style>
