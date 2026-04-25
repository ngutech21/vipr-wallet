<template>
  <div class="transaction-content">
    <section class="transaction-card transaction-card--summary">
      <div class="amount-section">
        <div
          class="amount-value"
          :class="transaction.type === 'withdraw' ? 'text-negative' : 'text-positive'"
        >
          <template v-if="amountInSats != null">
            {{ transaction.type === 'deposit' ? '+' : '-' }}{{ amountInSats }}
          </template>
          <template v-else>Amount unavailable</template>
        </div>
        <div class="amount-fiat">≈ ${{ amountInFiat }} USD</div>
      </div>

      <div class="summary-row">
        <div class="transaction-type">
          <q-icon
            :name="transaction.type === 'withdraw' ? 'arrow_upward' : 'arrow_downward'"
            :color="transaction.type === 'withdraw' ? 'negative' : 'positive'"
            size="2rem"
          />
          <div class="summary-meta">
            <span class="summary-title">
              {{ transactionTitle }}
            </span>

            <q-badge
              :color="getWalletTransactionStatusColor(statusLabel)"
              class="status-badge"
              v-if="statusLabel"
            >
              {{ statusLabel }}
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
          <div class="label">Network Fee</div>
          <div class="value">{{ feeInSats }} sats</div>
        </div>
        <div class="detail-row detail-row--separated">
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
        <div class="detail-row detail-row--separated detail-row--block">
          <div class="detail-row__heading">
            <div class="label">Bitcoin address</div>
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

          <div class="address-section">
            <div class="address-container">
              <div class="address-text">{{ transaction.onchainAddress }}</div>
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
