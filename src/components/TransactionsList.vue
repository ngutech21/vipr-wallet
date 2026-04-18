<template>
  <div class="transactions-list q-ml-md q-mr-md q-pt-md">
    <ul class="transaction-list-container">
      <template v-for="transaction in transactions" :key="String(transaction.operationId)">
        <LightningTransactionItem
          v-if="transaction.kind === 'ln'"
          :transaction="transaction as LightningTransaction"
          @click="viewTransactionDetails"
        />
        <EcashTransactionItem
          v-else-if="transaction.kind === 'mint'"
          :transaction="transaction as EcashTransaction"
          @click="viewTransactionDetails"
        />
        <WalletTransactionItem
          v-else-if="transaction.kind === 'wallet'"
          :transaction="transaction as WalletTransaction"
          @click="viewTransactionDetails"
        />
      </template>

      <q-item
        v-if="!isInitialLoading && transactions.length === 0"
        class="text-center"
        :data-testid="emptyTransactionsTestId"
      >
        <q-item-section>
          <p class="text-grey-6">No transactions yet</p>
        </q-item-section>
      </q-item>
    </ul>

    <div v-if="showFullHistoryAction" class="transactions-footer">
      <q-btn
        flat
        no-caps
        color="white"
        class="transactions-footer-btn transactions-footer-btn--link"
        label="Show full history"
        icon-right="chevron_right"
        @click="openFullHistory"
        data-testid="transactions-show-full-history-btn"
      />
    </div>

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

const HOME_PAGE_SIZE = 5
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

    const page = await walletStore.getTransactionsPage(pageSize.value)
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

    const page = await walletStore.getTransactionsPage(pageSize.value, nextCursor.value)
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
  await router.push({ name: '/transaction/[id]', params: { id } })
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
  padding-bottom: 120px;
}

.transaction-list-container {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.transactions-footer {
  display: flex;
  justify-content: center;
  padding-top: 8px;
}

.transactions-footer--history {
  padding-top: 16px;
}

.transactions-footer-btn {
  font-weight: 600;
}

.transactions-footer-btn--link {
  opacity: 0.92;
}

.transaction-item {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  margin-bottom: 4px;
  padding-left: 0;
  padding-right: 0;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }

  &:active {
    background-color: rgba(255, 255, 255, 0.08);
  }
}

.transaction-amount {
  font-weight: 500;
  text-align: right;
}
</style>
