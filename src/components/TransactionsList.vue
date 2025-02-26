<template>
  <div class="transactions-list q-ml-md q-mr-md">
    <ul class="transaction-list-container">
      <li
        v-for="transaction in recentTransactions"
        :key="String(transaction.id)"
        class="transaction-item"
      >
        <q-icon
          :name="transaction.type === 'send' ? 'arrow_upward' : 'arrow_downward'"
          class="transaction-icon"
          :color="transaction.type === 'send' ? 'negative' : 'positive'"
        />

        <span class="transaction-date">
          {{ transaction.type === 'send' ? 'Sent' : 'Received' }}
          <br />{{ new Date(transaction.createdAt).toLocaleString() }}
        </span>

        <span
          class="transaction-amount"
          :class="transaction.type === 'send' ? 'negative' : 'positive'"
        >
          {{ transaction.type === 'send' ? '- ' : '+ ' }}
          {{ transaction.amountInSats.toLocaleString() }} sats
        </span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useTransactionsStore } from 'src/stores/transactions'
import { QIcon } from 'quasar'

const transactionsStore = useTransactionsStore()

onMounted(async () => {
  await transactionsStore.loadAllTransactions()
})

const recentTransactions = computed(() => transactionsStore.recentTransactions)
</script>

<style scoped>
.transactions-list {
  padding: 16px;
}

.transaction-list-container {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.transaction-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #ccc;
}

.transaction-icon {
  margin-right: 16px;
  font-size: 24px;
  font-weight: bold;
  color: var(--q-positive);
}

.transaction-date {
  margin-right: 16px;
}

.transaction-amount {
  text-align: right;
  color: var(--q-positive);
}
</style>
