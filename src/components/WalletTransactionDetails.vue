<template>
  <div class="transaction-content q-pa-md">
    <section class="transaction-card transaction-card--summary">
      <div class="amount-section text-center">
        <div
          class="amount-value text-h4"
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
              class="status-badge q-pa-sm text-caption"
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

          <div class="address-section q-mt-sm">
            <div class="address-container">
              <div class="address-text text-caption">{{ transaction.onchainAddress }}</div>
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

.transaction-card--details {
  background: rgba(255, 255, 255, 0.012);
  border-color: rgba(255, 255, 255, 0.045);
  padding: 6px 18px 14px;
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
  gap: 8px;
  min-width: 0;
  flex-wrap: nowrap;
}

.status-badge {
  flex-shrink: 0;
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
    border-top: 1px solid rgba(255, 255, 255, 0.055);
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

.detail-row--block {
  display: block;
  padding-top: 14px;
}

.detail-row__heading {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.copy-button {
  color: rgba(255, 255, 255, 0.78);
}

.address-section {
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 16px;
  padding: 12px 14px;

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
