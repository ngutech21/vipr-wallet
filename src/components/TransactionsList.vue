<template>
  <div class="q-ml-md q-mr-md q-pt-md">
    <ul class="transaction-list-container">
      <q-item
        clickable
        v-ripple
        v-for="transaction in recentTransactions"
        :key="String(transaction.id)"
        class="transaction-item"
        @click="viewTransactionDetails(transaction.id)"
      >
        <q-item-section avatar>
          <q-icon
            :name="transaction.type === 'send' ? 'arrow_upward' : 'arrow_downward'"
            :color="transaction.type === 'send' ? 'negative' : 'positive'"
            size="md"
          />
        </q-item-section>

        <q-item-section>
          <q-item-label>{{ transaction.type === 'send' ? 'Sent' : 'Received' }}</q-item-label>
          <q-item-label caption>{{
            date.formatDate(transaction.createdAt, 'MMMM D, YYYY - h:mm A')
          }}</q-item-label>
        </q-item-section>

        <q-item-section side>
          <div
            class="transaction-amount"
            :class="transaction.type === 'send' ? 'text-negative' : 'text-positive'"
          >
            {{ transaction.type === 'send' ? '- ' : '+ ' }}
            {{ transaction.amountInSats.toLocaleString() }} sats
          </div>
          <div class="text-caption text-grey">
            ≈ ${{ transaction.amountInFiat.toFixed(2) }} {{ transaction.fiatCurrency }}
          </div>
        </q-item-section>

        <q-item-section side>
          <q-icon name="chevron_right" color="grey-6" />
        </q-item-section>
      </q-item>
      <q-item v-if="recentTransactions.length === 0" class="text-center">
        <q-item-section>
          <p class="text-grey-6">No transactions yet</p>
        </q-item-section>
      </q-item>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useTransactionsStore } from 'src/stores/transactions'
import { QIcon } from 'quasar'
import { date } from 'quasar'

const transactionsStore = useTransactionsStore()

onMounted(async () => {
  await transactionsStore.loadAllTransactions()
})

const recentTransactions = computed(() => transactionsStore.recentTransactions)

import { useRouter } from 'vue-router'

const router = useRouter()

async function viewTransactionDetails(id: string) {
  await router.push(`/transaction/${id}`)
}
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
