<template>
  <div class="transactions-list">
    <ul class="q-pa-xl q-ma-none">
      <li
        v-for="transaction in transactions"
        :key="String(transaction.id)"
        class="transaction-item"
      >
        <q-icon name="arrow_downward" class="transaction-icon" />
        <span class="transaction-date"
          >Received <br />{{ new Date(transaction.createdAt).toLocaleString() }}</span
        >
        <span class="transaction-amount"
          >+ {{ transaction.amountInSats.toLocaleString() }} Sats</span
        >
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useLightningTransactionsStore } from 'src/stores/transactions'
import { QIcon } from 'quasar'

const lightningTransactionsStore = useLightningTransactionsStore()

onMounted(async () => {
  await lightningTransactionsStore.loadTransactions()
})

const transactions = computed(() => lightningTransactionsStore.transactions)
</script>

<style scoped>
.transactions-list {
  padding: 16px;
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
