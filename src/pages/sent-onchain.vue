<route lang="yaml">
meta:
  hideBottomNav: true
</route>

<template>
  <q-page class="page-container" data-testid="sent-onchain-page">
    <div class="content-container q-pa-md">
      <q-btn
        flat
        round
        color="white"
        icon="close"
        class="absolute-top-right q-ma-md"
        @click="goHome"
        data-testid="sent-onchain-close-btn"
      />

      <div class="success-icon-container">
        <q-icon :name="statusIcon" size="4em" :color="statusColor" />
      </div>
      <div class="text-h4 text-weight-bold q-mt-lg gradient-text" data-testid="sent-onchain-title">
        {{ statusTitle }}
      </div>

      <q-card class="payment-card q-mt-lg q-pa-md">
        <div class="row justify-between items-center q-py-sm">
          <div class="text-subtitle1 text-weight-medium">Status</div>
          <q-badge :color="statusColor" class="q-pa-sm" data-testid="sent-onchain-status-text">
            {{ statusText }}
          </q-badge>
        </div>

        <q-separator class="q-my-sm opacity-4" />

        <div class="row justify-between items-center q-py-sm">
          <div class="text-subtitle1 text-weight-medium">Amount</div>
          <div class="text-h6 text-weight-bold" data-testid="sent-onchain-amount-text">
            {{ formatNumber(displayAmount) }} <span class="text-caption">sats</span>
          </div>
        </div>

        <q-separator class="q-my-sm opacity-4" />

        <div class="row justify-between items-start q-py-sm">
          <div class="text-subtitle1 text-weight-medium">Destination</div>
          <div class="text-caption text-right address-text" data-testid="sent-onchain-address-text">
            {{ displayAddress }}
          </div>
        </div>

        <template v-if="feeInSats > 0">
          <q-separator class="q-my-sm opacity-4" />

          <div class="row justify-between items-center q-py-sm">
            <div class="text-subtitle1 text-weight-medium">Recorded Fee</div>
            <div class="text-subtitle1 text-weight-bold" data-testid="sent-onchain-fee-text">
              {{ formatNumber(feeInSats) }} <span class="text-caption">sats</span>
            </div>
          </div>
        </template>
      </q-card>

      <div v-if="statusMessage" class="text-caption text-white q-mt-md">
        {{ statusMessage }}
      </div>

      <div class="row q-col-gutter-sm q-mt-xl">
        <div class="col">
          <q-btn
            flat
            color="white"
            class="full-width"
            label="Back to Home"
            @click="goHome"
            data-testid="sent-onchain-back-home-btn"
          />
        </div>
        <div v-if="transaction != null" class="col">
          <q-btn
            color="white"
            text-color="primary"
            class="full-width"
            label="View Details"
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
  if (
    operationId === '' ||
    transaction.value != null ||
    refreshAttempts.value >= MAX_POLL_ATTEMPTS
  ) {
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
      return
    }
  } catch (error) {
    logger.error('Failed to refresh onchain withdrawal transaction', error)
  }

  scheduleNextRefresh()
}

function scheduleNextRefresh() {
  if (refreshAttempts.value >= MAX_POLL_ATTEMPTS || transaction.value != null) {
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
</script>

<style scoped>
.page-container {
  position: relative;
  background: linear-gradient(145deg, #0f172a 0%, #1d4ed8 100%);
  min-height: 100vh;
  overflow: hidden;
}

.content-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.payment-card {
  width: 100%;
  max-width: 520px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.address-text {
  max-width: 260px;
  word-break: break-all;
}
</style>
