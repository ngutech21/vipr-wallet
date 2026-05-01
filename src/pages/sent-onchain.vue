<route lang="yaml">
meta:
  hideBottomNav: true
</route>

<template>
  <SuccessResultLayout
    page-class="page-container--onchain"
    page-test-id="sent-onchain-page"
    close-test-id="sent-onchain-close-btn"
    title-test-id="sent-onchain-title"
    amount-test-id="sent-onchain-amount-text"
    :title="statusTitle"
    :amount-text="`${formatNumber(displayAmount)} sats`"
    :subtitle="statusMessage"
    :icon="statusIcon"
    :icon-color="statusColor"
    @close="goHome"
  >
    <template #summary>
      <q-card flat class="success-card">
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
    </template>

    <template #actions>
      <div class="success-actions">
        <q-btn
          color="primary"
          no-caps
          unelevated
          class="success-action-btn vipr-btn vipr-btn--primary vipr-btn--lg"
          label="Back to home"
          data-testid="sent-onchain-back-home-btn"
          @click="goHome"
        />
        <q-btn
          v-if="transaction != null"
          flat
          color="white"
          no-caps
          class="success-secondary-btn vipr-btn vipr-btn--secondary vipr-btn--lg"
          label="View details"
          data-testid="sent-onchain-view-details-btn"
          @click="viewTransaction"
        />
      </div>
    </template>
  </SuccessResultLayout>
</template>

<script setup lang="ts">
defineOptions({
  name: 'SentOnchainPage',
})

import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { WalletTransaction } from '@fedimint/core'
import SuccessResultLayout from 'src/components/SuccessResultLayout.vue'
import { logger } from 'src/services/logger'
import { useWalletStore } from 'src/stores/wallet'
import { useFormatters } from 'src/utils/formatter'
import { getQueryInteger, getQueryStringOrEmpty } from 'src/utils/routeQuery'

const MAX_POLL_ATTEMPTS = 10
const POLL_INTERVAL_MS = 3_000

const { formatNumber } = useFormatters()
const route = useRoute()
const router = useRouter()
const walletStore = useWalletStore()

const transaction = ref<WalletTransaction | null>(null)
const refreshAttempts = ref(0)

let pollTimeout: ReturnType<typeof setTimeout> | null = null

const operationId = getQueryStringOrEmpty(route.query.operationId)
const submittedAddress = getQueryStringOrEmpty(route.query.address)
const submittedAmount = getQueryInteger(route.query.amount)

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

function applyTransactionUpdate(nextTransaction: WalletTransaction) {
  transaction.value = nextTransaction
}

function isTerminalOutcome(outcome: WalletTransaction['outcome'] | undefined): boolean {
  return outcome === 'Confirmed' || outcome === 'Claimed' || outcome === 'Failed'
}
</script>
