<template>
  <div class="q-ml-md q-mr-md q-pt-md">
    <ul class="transaction-list-container">
      <q-item
        clickable
        v-ripple
        v-for="transaction in recentTransactions"
        :key="String(transaction.operationId)"
        class="transaction-item"
        @click="viewTransactionDetails(transaction.operationId)"
      >
        <q-item-section avatar>
          <q-icon
            :name="transaction.type === 'send' ? 'arrow_upward' : 'arrow_downward'"
            :color="transaction.type === 'send' ? 'negative' : 'positive'"
            size="md"
          />
        </q-item-section>

        <q-item-section>
          <q-item-label>{{ transaction.type === 'send'  ? 'Sent' : 'Received' }}</q-item-label>
          <q-item-label caption>{{
            date.formatDate(transaction.timestamp, 'MMMM D, YYYY - h:mm A')
          }}</q-item-label>
        </q-item-section>


        <q-item-section side v-if="transaction.kind === 'ln'">
          <div
            class="transaction-amount"
            :class="transaction.type === 'send' ? 'text-negative' : 'text-positive'"
          >
            {{ transaction.type === 'send' ? '- ' : '+ ' }}
            {{  amountInSats(transaction as LightningTransaction) }} sats
          </div>
          <div class="text-caption text-grey">
            ≈ ${{ amountInFiat(transaction as LightningTransaction) }} {{ 'usd' }}
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
import { onMounted, ref } from 'vue'
import { QIcon } from 'quasar'
import { date } from 'quasar'
import { useRouter } from 'vue-router'
import { useWalletStore } from 'src/stores/wallet'
import type { LightningTransaction, Transactions } from '@fedimint/core-web'
import { useLightningStore } from 'src/stores/lightning'


const walletStore = useWalletStore()
const router = useRouter()
const recentTransactions = ref<Transactions[]>([])
const isLoading = ref(false)

const lightningStore = useLightningStore()

onMounted(async () => {
  await loadTransactions()
})

async function loadTransactions() {
  try {
    isLoading.value = true
    recentTransactions.value = await walletStore.getTransactions()
  } catch (error) {
    console.error('Failed to load transactions:', error)
    recentTransactions.value = []
  } finally {
    isLoading.value = false
  }
}


// FIXME create component for this
function amountInSats(tx: LightningTransaction): string {
      const invoice = lightningStore.decodeInvoice(tx.invoice)
      return invoice.amount.toLocaleString()
}


async function amountInFiat(tx: LightningTransaction): Promise<string> {
      const invoice = lightningStore.decodeInvoice(tx.invoice)
      const fiatValue = await lightningStore.satsToFiat(invoice.amount)
      return fiatValue.toFixed(2)
}



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
