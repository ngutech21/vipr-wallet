<template>
  <div class="transaction-content q-pa-md">
    <!-- Amount section -->
    <div class="amount-section text-center q-py-lg">
      <div
        class="text-h4 text-weight-bold"
        :class="transaction.type === 'withdraw' ? 'text-negative' : 'text-positive'"
      >
        <template v-if="amountInSats != null">
          {{ transaction.type === 'deposit' ? '+' : '-' }}{{ amountInSats }}
        </template>
        <template v-else>Amount unavailable</template>
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
          {{ transactionTitle }}
        </span>
      </div>

      <q-badge
        :color="getWalletTransactionStatusColor(statusLabel)"
        class="status-badge q-pa-sm text-caption"
        v-if="statusLabel"
      >
        {{ statusLabel }}
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
      <q-btn
        flat
        dense
        round
        icon="content_copy"
        @click="copyAddress"
        class="copy-button"
        data-testid="wallet-transaction-details-copy-address-btn"
      />
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

    <!-- Total -->
    <q-separator class="q-my-md" />
    <div class="detail-row">
      <div class="label">
        {{ transaction.type === 'withdraw' ? 'Total Debited' : 'Net Deposited' }}
      </div>
      <div
        class="value"
        :class="transaction.type === 'withdraw' ? 'text-negative' : 'text-positive'"
      >
        <template v-if="totalAmountText != null">
          {{ transaction.type === 'withdraw' ? '-' : '+' }}{{ totalAmountText }} sats
        </template>
        <template v-else>Unknown</template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { date } from 'quasar'
import { useAppNotify } from 'src/composables/useAppNotify'
import { useFederationStore } from 'src/stores/federation'
import { useLightningStore } from 'src/stores/lightning'
import type { WalletTransaction } from '@fedimint/core'
import { logger } from 'src/services/logger'
import {
  getWalletTransactionDetailTitle,
  getWalletTransactionAmountSats,
  getWalletTransactionFeeSats,
  getWalletTransactionStatusColor,
  getWalletTransactionStatusLabel,
  getWalletTransactionTotalDebitedSats,
} from 'src/utils/walletTransactionPresentation'

interface Props {
  transaction: WalletTransaction
}

const props = defineProps<Props>()

const federationStore = useFederationStore()
const lightningStore = useLightningStore()
const notify = useAppNotify()
const amountInFiat = ref<string>('0.00')
const transactionTitle = computed(() => getWalletTransactionDetailTitle(props.transaction))
const statusLabel = computed(() => getWalletTransactionStatusLabel(props.transaction))

const amountInSats = computed(() => {
  const amountSats = getWalletTransactionAmountSats(props.transaction)
  return amountSats != null ? amountSats.toLocaleString() : null
})

const feeInSats = computed(() => {
  return getWalletTransactionFeeSats(props.transaction).toLocaleString()
})

const totalAmountText = computed(() => {
  if (props.transaction.type === 'withdraw') {
    const totalDebited = getWalletTransactionTotalDebitedSats(props.transaction)
    return totalDebited != null ? totalDebited.toLocaleString() : null
  }

  const amountSats = getWalletTransactionAmountSats(props.transaction)
  if (amountSats == null) {
    return null
  }

  const feeSats = getWalletTransactionFeeSats(props.transaction)
  return Math.abs(amountSats - feeSats).toLocaleString()
})

const federationTitle = computed(() => {
  return federationStore.selectedFederation?.title ?? 'Unknown Federation'
})

onMounted(async () => {
  try {
    const sats = getWalletTransactionAmountSats(props.transaction) ?? 0
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

async function copyAddress() {
  try {
    await navigator.clipboard.writeText(props.transaction.onchainAddress)
    notify.success('Address copied to clipboard')
  } catch (error) {
    logger.error('Failed to copy address to clipboard', error)
    notify.error('Failed to copy address')
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
