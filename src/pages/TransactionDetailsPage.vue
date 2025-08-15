<template>
  <transition
    appear
    enter-active-class="animated slideInLeft fast"
    leave-active-class="animated slideOutLeft fast"
    mode="out-in"
  >
    <q-layout class="dark-gradient">
      <q-page-container>
        <q-page class="transaction-details-page">
          <q-toolbar class="header-section">
            <q-btn flat round color="white" icon="arrow_back" @click="navigateBack" />
            <q-toolbar-title class="text-center no-wrap">Transaction</q-toolbar-title>
            <div class="q-ml-md" style="width: 40px"></div>
          </q-toolbar>

          <!-- Loading state -->
          <div v-if="loading" class="full-height column flex-center">
            <q-spinner color="primary" size="3em" />
            <div class="q-mt-sm">Loading transaction...</div>
          </div>

          <!-- Error state -->
          <div v-else-if="error" class="full-height column flex-center">
            <q-icon name="error_outline" color="negative" size="3em" />
            <div class="q-mt-sm">{{ error }}</div>
            <q-btn color="primary" label="Go Back" class="q-mt-md" @click="navigateBack" />
          </div>

          <!-- Transaction content -->
          <div v-else-if="transaction" class="transaction-content q-pa-md">
            <!-- Amount section -->
            <div class="amount-section text-center q-py-lg">
              <div
                class="text-h4 text-weight-bold"
                :class="transaction.type === 'send' ? 'text-negative' : 'text-positive'"
              >
                {{ transaction.type === 'receive' ? '+' : '-'
                }}{{ formatSats(transaction.amountInSats) }}
              </div>
              <div class="text-caption text-grey">
                ≈ ${{ transaction.amountInFiat.toFixed(2) }} {{ transaction.fiatCurrency }}
              </div>
            </div>

            <!-- Transaction type and status badge -->
            <div class="row items-center justify-between q-mb-lg">
              <div class="transaction-type">
                <q-icon
                  :name="transaction.type === 'receive' ? 'arrow_downward' : 'arrow_upward'"
                  :class="transaction.type === 'receive' ? 'text-positive' : 'text-accent'"
                  size="2rem"
                  class="q-mr-sm"
                />
                <span class="text-subtitle1">
                  {{ transaction.type === 'receive' ? 'Received' : 'Sent' }}
                </span>
              </div>

              <q-badge
                :color="getStatusColor(transaction.outcome)"
                class="status-badge q-pa-sm text-caption"
                v-if="transaction.outcome"
              >
                {{ transaction.outcome.toUpperCase() }}
              </q-badge>
            </div>

            <!-- Time and date -->
            <q-separator class="q-my-md" />

            <div class="detail-row">
              <div class="label">Created on</div>
              <div class="value">{{ formatDate(transaction.timestamp) }}</div>
            </div>

            <!-- Additional details based on transaction type -->
            <q-separator class="q-my-md" />

            <!-- Memo if available FIXME -->

            <!-- <div v-if="transaction.memo" class="detail-row">
              <div class="label">Memo</div>
              <div class="value">{{ transaction.invoice }}</div>
            </div> -->

            <div class="detail-row">
              <div class="label">Federation</div>
              <div class="value">
                {{ federationTitle }}
              </div>
            </div>

            <!-- Fee for sent transactions -->
            <q-separator
              class="q-my-md"
              v-if="transaction.type === 'send' && transaction.fee"
            />
            <div v-if="transaction.type === 'send' && transaction.fee" class="detail-row">
              <div class="label">Fee</div>
              <div class="value">{{ formatMsats(transaction.fee) }} sats</div>
            </div>

            <q-separator class="q-my-md" />
            <div class="detail-row">
              <div class="label">Transaction ID</div>
              <div class="value text-caption">{{ transaction.txId }}</div>
            </div>

            <!-- Lightning invoice section -->
            <q-separator class="q-my-md" />
            <div class="detail-row">
              <div class="label">Lightning Invoice</div>
              <q-btn
                flat
                dense
                round
                icon="content_copy"
                @click="copyInvoice"
                class="copy-button"
              />
            </div>

            <div class="invoice-section q-mt-sm">
              <div class="invoice-container">
                <div class="invoice-text text-caption">{{ transaction.invoice }}</div>
              </div>
            </div>
          </div>
        </q-page>
      </q-page-container>
    </q-layout>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Notify } from 'quasar'
import type { LightningAmountTransaction } from 'src/components/models'
import { useFederationStore } from 'src/stores/federation'
import { date } from 'quasar'
import { useWalletStore } from 'src/stores/wallet'

const route = useRoute()
const router = useRouter()
const federationStore = useFederationStore()
const walletStore = useWalletStore()

const transaction = ref<LightningAmountTransaction | null>(null)
const loading = ref(true)
const error = ref('')

async function navigateBack() {
  await router.push('/')
}

onMounted(async () => {

  const allTransactions = await walletStore.getTransactions()

  try {
    const transactionId = route.params.id as string

    if (!transactionId) {
      error.value = 'Transaction ID is missing'
      loading.value = false
      return
    }


    const foundTransaction = allTransactions.find((tx) => tx.txId === transactionId)

    if (foundTransaction) {
      transaction.value = foundTransaction
    } else {
      console.warn('Transaction not found in initial load:', transactionId)
    }
  } catch (err) {
    error.value = 'Error loading transaction details'
    console.error('Error in transaction details:', err)
  } finally {
    loading.value = false
  }
})

// Get federation title for sent transactions
const federationTitle = computed(() => {
  const federation = federationStore.federations.find(
    (f) => f.federationId === transaction.value?.federationId,
  )

  return federation?.title || transaction.value?.federationId
})
// Helper functions
function formatSats(sats: number): string {
  return sats.toLocaleString() + ' sats'
}

function formatMsats(msats: number): string {
  return Math.round(msats / 1000).toLocaleString()
}

function formatDate(param: number): string {
  return date.formatDate(param, 'MMMM D, YYYY - h:mm A')
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'claimed':
    case 'success':
    case 'funded':
      return 'positive'
    case 'created':
    case 'pending':
      return 'warning'
    case 'unexpected_error':
      return 'negative'
    default:
      return 'grey'
  }
}

async function copyInvoice() {
  if (transaction.value) {
    await navigator.clipboard.writeText(transaction.value.invoice)
    Notify.create({
      message: 'Invoice copied to clipboard',
      color: 'positive',
      position: 'top',
    })
  }
}
</script>

<style lang="scss" scoped>
.animated {
  position: absolute;
}
.transaction-details-page {
  padding-bottom: 80px;

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

  .invoice-section {
    background-color: rgba(0, 0, 0, 0.05);
    border-radius: 8px;
    padding: 12px;

    .invoice-container {
      max-height: 80px;
      overflow-y: auto;

      .invoice-text {
        word-break: break-all;
        font-family: monospace;
      }
    }
  }

  .action-button {
    min-width: 150px;
  }
}

/* Dark mode adjustments */
.body--dark {
  .invoice-section {
    background-color: rgba(255, 255, 255, 0.1);
  }
}
</style>
