<route lang="yaml">
meta:
  hideBottomNav: true
</route>

<template>
  <transition
    appear
    enter-active-class="animated slideInLeft fast"
    leave-active-class="animated slideOutLeft fast"
    mode="out-in"
  >
    <q-page class="vipr-mobile-page transaction-details-page">
      <div
        v-touch-swipe.right.mouse="navigateBack"
        class="vipr-topbar transaction-details-topbar"
        data-testid="transaction-details-swipe-zone"
      >
        <q-btn
          flat
          round
          color="white"
          icon="arrow_back"
          class="vipr-topbar__back vipr-topbar__back--bleed transaction-details-topbar__back"
          @click="navigateBack"
          data-testid="transaction-details-back-btn"
        />
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="transaction-state">
        <q-spinner color="primary" size="3em" />
        <div class="transaction-state__message">Loading transaction...</div>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="transaction-state">
        <q-icon name="error_outline" color="negative" size="3em" />
        <div class="transaction-state__message">{{ error }}</div>
        <q-btn
          color="primary"
          label="Go Back"
          class="transaction-state__action"
          @click="navigateBack"
          data-testid="transaction-details-error-go-back-btn"
        />
      </div>

      <!-- Transaction content -->
      <template v-if="transaction">
        <LightningTransactionDetails
          v-if="transaction.kind === 'ln'"
          :transaction="transaction as import('@fedimint/core').LightningTransaction"
        />
        <EcashTransactionDetails
          v-else-if="transaction.kind === 'mint'"
          :transaction="transaction as import('@fedimint/core').EcashTransaction"
        />
        <WalletTransactionDetails
          v-else-if="transaction.kind === 'wallet'"
          :transaction="transaction as import('@fedimint/core').WalletTransaction"
        />
      </template>
    </q-page>
  </transition>
</template>

<script setup lang="ts">
defineOptions({
  name: 'TransactionDetailsPage',
})

import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWalletStore } from 'src/stores/wallet'
import type { Transactions } from '@fedimint/core'
import LightningTransactionDetails from 'src/components/LightningTransactionDetails.vue'
import EcashTransactionDetails from 'src/components/EcashTransactionDetails.vue'
import WalletTransactionDetails from 'src/components/WalletTransactionDetails.vue'
import { logger } from 'src/services/logger'

const route = useRoute('/transaction/[id]')
const router = useRouter()
const walletStore = useWalletStore()

const transaction = ref<Transactions | null>(null)
const loading = ref(true)
const error = ref('')

async function navigateBack() {
  await router.replace(
    route.query.backTo === 'transactions' ? { name: '/transactions' } : { name: '/' },
  )
}

onMounted(async () => {
  try {
    const operationId = route.params.id

    if (operationId === '') {
      error.value = 'Transaction ID is missing'
      loading.value = false
      return
    }

    const foundTransaction = await walletStore.getTransactionByOperationId(operationId)

    if (foundTransaction != null) {
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

<style scoped>
.transaction-state {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.transaction-state__message {
  margin-top: var(--vipr-space-2);
}

.transaction-state__action {
  margin-top: var(--vipr-space-4);
}
</style>

<style lang="scss" scoped>
.animated {
  position: absolute;
}

.transaction-details-page {
  padding-bottom: 140px;
  padding-bottom: calc(140px + env(safe-area-inset-bottom));
}
</style>
