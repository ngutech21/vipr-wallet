<template>
  <div
    :class="['transactions-list', { 'transactions-list--home': props.mode === 'home' }]"
    class="q-px-md q-pb-md"
  >
    <div
      v-if="showTransactionsCard"
      class="transactions-card vipr-surface-card vipr-surface-card--strong"
      data-testid="transactions-card"
    >
      <div class="transactions-header">
        <div>
          <div class="transactions-title">
            {{ props.mode === 'home' ? 'Recent transactions' : 'Transaction history' }}
          </div>
        </div>

        <q-btn
          v-if="showFullHistoryAction"
          flat
          dense
          no-caps
          color="white"
          class="transactions-header-action"
          label="View all"
          icon-right="chevron_right"
          @click="openFullHistory"
          data-testid="transactions-show-full-history-btn"
        />
      </div>

      <ul class="transaction-list-container">
        <template v-for="transaction in transactions" :key="String(transaction.operationId)">
          <LightningTransactionItem
            v-if="transaction.kind === 'ln'"
            :transaction="transaction as LightningTransaction"
            :compact-timestamp="useCompactTimestamps"
            @click="viewTransactionDetails"
          />
          <EcashTransactionItem
            v-else-if="transaction.kind === 'mint'"
            :transaction="transaction as EcashTransaction"
            :compact-timestamp="useCompactTimestamps"
            @click="viewTransactionDetails"
          />
          <WalletTransactionItem
            v-else-if="transaction.kind === 'wallet'"
            :transaction="transaction as WalletTransaction"
            :compact-timestamp="useCompactTimestamps"
            @click="viewTransactionDetails"
          />
        </template>

        <q-item
          v-if="!isInitialLoading && transactions.length === 0"
          class="vipr-empty-state vipr-empty-state--inline"
          :data-testid="emptyTransactionsTestId"
        >
          <q-item-section>
            <div class="vipr-empty-state__title">No transactions yet</div>
            <div class="vipr-empty-state__body">
              {{
                props.mode === 'home'
                  ? 'Your latest activity will show up here.'
                  : 'Transactions for this federation will appear here once you start using it.'
              }}
            </div>
          </q-item-section>
        </q-item>
      </ul>

      <div v-if="showLoadMoreAction" class="transactions-footer transactions-footer--history">
        <q-btn
          outline
          no-caps
          color="white"
          class="transactions-footer-btn"
          label="Show more"
          :loading="isLoadingMore"
          :disable="isLoadingMore"
          @click="loadMoreTransactions"
          data-testid="transactions-show-more-btn"
        >
          <template #loading>
            <q-spinner-dots color="white" />
          </template>
        </q-btn>
      </div>
    </div>

    <div
      v-else-if="showHomeEmptyState"
      class="vipr-empty-state vipr-empty-state--compact"
      data-testid="transactions-empty-home"
    >
      <div class="vipr-empty-state__title">No transactions yet</div>
      <div class="vipr-empty-state__body">Your latest activity will show up here.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from 'src/stores/wallet'
import { useFederationStore } from 'src/stores/federation'
import type {
  EcashTransaction,
  LightningTransaction,
  OperationKey,
  Transactions,
  WalletTransaction,
} from '@fedimint/core'
import LightningTransactionItem from './LightningTransactionItem.vue'
import EcashTransactionItem from './EcashTransactionItem.vue'
import WalletTransactionItem from './WalletTransactionItem.vue'
import { logger } from 'src/services/logger'

const props = withDefaults(
  defineProps<{
    mode?: 'home' | 'history'
  }>(),
  {
    mode: 'home',
  },
)

const HOME_PAGE_SIZE = 3
const HISTORY_PAGE_SIZE = 20

const walletStore = useWalletStore()
const federationStore = useFederationStore()
const router = useRouter()
const transactions = ref<Transactions[]>([])
const isInitialLoading = ref(false)
const isLoadingMore = ref(false)
const hasMore = ref(false)
const nextCursor = ref<OperationKey | null>(null)
const emptyTransactionsTestId = 'transactions-empty-state'
let activeLoadRequestId = 0

const pageSize = computed(() => (props.mode === 'history' ? HISTORY_PAGE_SIZE : HOME_PAGE_SIZE))
const useCompactTimestamps = computed(() => props.mode === 'home')
const showHomeEmptyState = computed(() => {
  return props.mode === 'home' && !isInitialLoading.value && transactions.value.length === 0
})
const showTransactionsCard = computed(() => {
  return props.mode === 'history' || transactions.value.length > 0 || isInitialLoading.value
})
const showFullHistoryAction = computed(() => {
  return props.mode === 'home' && hasMore.value
})
const showLoadMoreAction = computed(() => {
  return props.mode === 'history' && transactions.value.length > 0 && hasMore.value
})

watch(
  () => federationStore.selectedFederationId,
  () => {
    loadInitialTransactions().catch((error) => {
      logger.error('Failed to reload transactions after federation change', error)
    })
  },
  { immediate: true },
)

async function loadInitialTransactions() {
  const requestId = ++activeLoadRequestId

  try {
    isInitialLoading.value = true
    isLoadingMore.value = false

    const page = await walletStore.getTransactionsPage(pageSize.value, undefined, {
      visibleOnly: true,
    })
    if (requestId !== activeLoadRequestId) {
      return
    }

    applyInitialPage(page)
  } catch (error) {
    if (requestId !== activeLoadRequestId) {
      return
    }

    logger.error('Failed to load transactions', error)
    resetTransactions()
  } finally {
    if (requestId === activeLoadRequestId) {
      finishInitialLoad()
    }
  }
}

async function loadMoreTransactions() {
  if (
    props.mode !== 'history' ||
    isLoadingMore.value ||
    nextCursor.value == null ||
    !hasMore.value
  ) {
    return
  }

  const requestId = activeLoadRequestId

  try {
    isLoadingMore.value = true

    const page = await walletStore.getTransactionsPage(pageSize.value, nextCursor.value, {
      visibleOnly: true,
    })
    if (requestId !== activeLoadRequestId) {
      return
    }

    appendTransactionsPage(page)
  } catch (error) {
    if (requestId !== activeLoadRequestId) {
      return
    }

    logger.error('Failed to load more transactions', error)
  } finally {
    if (requestId === activeLoadRequestId) {
      finishLoadMore()
    }
  }
}

function applyInitialPage(page: {
  transactions: Transactions[]
  nextCursor: OperationKey | null
  hasMore: boolean
}) {
  transactions.value = page.transactions
  nextCursor.value = page.nextCursor
  hasMore.value = page.hasMore
}

function appendTransactionsPage(page: {
  transactions: Transactions[]
  nextCursor: OperationKey | null
  hasMore: boolean
}) {
  transactions.value = [...transactions.value, ...page.transactions]
  nextCursor.value = page.nextCursor
  hasMore.value = page.hasMore
}

function resetTransactions() {
  transactions.value = []
  nextCursor.value = null
  hasMore.value = false
}

function finishInitialLoad() {
  isInitialLoading.value = false
}

function finishLoadMore() {
  isLoadingMore.value = false
}

async function openFullHistory() {
  await router.push({ path: '/transactions' })
}

async function viewTransactionDetails(id: string) {
  await router.push({
    name: '/transaction/[id]',
    params: { id },
    query: {
      backTo: props.mode === 'history' ? 'transactions' : 'home',
    },
  })
}

defineExpose({
  transactions,
  isInitialLoading,
  isLoadingMore,
  hasMore,
  nextCursor,
  loadInitialTransactions,
  loadMoreTransactions,
})
</script>

<style scoped>
.transactions-list {
  padding-bottom: 24px;
}

.transactions-list--home {
  max-width: 100%;
}

.transactions-list:not(.transactions-list--home) {
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
}

.transactions-card {
  padding: 20px;
}

.transactions-list--home .transactions-card {
  max-width: 700px;
  margin: 0 auto;
}

.transactions-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.transactions-title {
  color: white;
  font-size: 1rem;
  font-weight: 600;
}

.transactions-subtitle {
  margin-top: 4px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;
}

.transaction-list-container {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.transactions-footer {
  display: flex;
  justify-content: center;
  padding-top: 12px;
}

.transactions-footer--history {
  padding-top: 16px;
}

.transactions-footer-btn {
  font-weight: 600;
}

.transactions-header-action {
  flex-shrink: 0;
  border-radius: 14px;
  padding: 6px 8px 6px 10px;
  transition:
    background-color 160ms ease,
    box-shadow 160ms ease;
}

.transactions-header-action:hover {
  background-color: rgba(255, 255, 255, 0.028);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.025);
}

.transactions-header-action:active {
  background-color: rgba(255, 255, 255, 0.042);
}

.transactions-header-action :deep(.q-focus-helper) {
  display: none;
}

@media (max-width: 520px) {
  .transactions-header {
    flex-direction: column;
  }

  .transactions-list--home .transactions-header {
    flex-direction: row;
    align-items: center;
  }
}
</style>
