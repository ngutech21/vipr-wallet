<template>
  <div class="q-ml-md q-mr-md q-pt-md">
    <ul class="transaction-list-container">
      <template v-for="transaction in recentTransactions" :key="String(transaction.operationId)">
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
        v-if="recentTransactions.length === 0"
        class="text-center"
        :data-testid="emptyTransactionsTestId"
      >
        <q-item-section>
          <p class="text-grey-6">No transactions yet</p>
        </q-item-section>
      </q-item>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from 'src/stores/wallet'
import type {
  Transactions,
  LightningTransaction,
  EcashTransaction,
  WalletTransaction,
} from '@fedimint/core'
import LightningTransactionItem from './LightningTransactionItem.vue'
import EcashTransactionItem from './EcashTransactionItem.vue'
import WalletTransactionItem from './WalletTransactionItem.vue'
import { logger } from 'src/services/logger'

const walletStore = useWalletStore()
const router = useRouter()
const recentTransactions = ref<Transactions[]>([])
const isLoading = ref(false)
const emptyTransactionsTestId = 'transactions-empty-state'

onMounted(async () => {
  await loadTransactions()
})

async function loadTransactions() {
  try {
    isLoading.value = true
    recentTransactions.value = await walletStore.getTransactions()
  } catch (error) {
    logger.error('Failed to load transactions', error)
    recentTransactions.value = []
  } finally {
    isLoading.value = false
  }
}

async function viewTransactionDetails(id: string) {
  await router.push({ name: '/transaction/[id]', params: { id } })
}

defineExpose({
  recentTransactions,
  isLoading,
})
</script>

<style scoped>
.transaction-list-container {
  list-style-type: none;
  padding: 0px;
  margin: 0px;
}

.transaction-item {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  margin-bottom: 4px;
  padding-left: 0px;
  padding-right: 0px;
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
