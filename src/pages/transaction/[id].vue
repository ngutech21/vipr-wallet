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
          <template v-if="transaction">
            <LightningTransactionDetails
              v-if="transaction.kind === 'ln'"
              :transaction="transaction as import('@fedimint/core-web').LightningTransaction"
            />
            <EcashTransactionDetails
              v-else-if="transaction.kind === 'mint'"
              :transaction="transaction as import('@fedimint/core-web').EcashTransaction"
            />
            <WalletTransactionDetails
              v-else-if="transaction.kind === 'wallet'"
              :transaction="transaction as import('@fedimint/core-web').WalletTransaction"
            />
          </template>
        </q-page>
      </q-page-container>
    </q-layout>
  </transition>
</template>

<script setup lang="ts">
defineOptions({
  name: 'TransactionDetailsPage'
})

import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWalletStore } from 'src/stores/wallet'
import type { Transactions } from '@fedimint/core-web'
import LightningTransactionDetails from 'src/components/LightningTransactionDetails.vue'
import EcashTransactionDetails from 'src/components/EcashTransactionDetails.vue'
import WalletTransactionDetails from 'src/components/WalletTransactionDetails.vue'
import { logger } from 'src/services/logger'

const route = useRoute()
const router = useRouter()
const walletStore = useWalletStore()

const transaction = ref<Transactions | null>(null)
const loading = ref(true)
const error = ref('')

async function navigateBack() {
  await router.push('/')
}

onMounted(async () => {
  const allTransactions = await walletStore.getTransactions()

  try {
    const operationId = (route.params as { id: string }).id

    if (!operationId) {
      error.value = 'Transaction ID is missing'
      loading.value = false
      return
    }

    const foundTransaction = allTransactions.find((tx) => tx.operationId === operationId)

    if (foundTransaction) {
      transaction.value = foundTransaction
    } else {
      logger.warn('Transaction not found in initial load', { operationId })
      error.value = 'Transaction not found'
    }
  } catch (err) {
    error.value = 'Error loading transaction details'
    logger.error('Error loading transaction details', err)
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.animated {
  position: absolute;
}
.transaction-details-page {
  padding-bottom: 80px;
}
</style>
