<template>
  <transition
    appear
    enter-active-class="animated slideInLeft"
    leave-active-class="animated slideOutLeft"
  >
    <q-page class="transactions-page dark-gradient" data-testid="transactions-page">
      <div class="transactions-topbar">
        <q-btn flat round icon="arrow_back" @click="goBack" data-testid="transactions-back-btn" />
      </div>

      <TransactionsList mode="history" />
    </q-page>
  </transition>
</template>

<script setup lang="ts">
defineOptions({
  name: 'TransactionsPage',
})

import { useRouter } from 'vue-router'
import TransactionsList from 'src/components/TransactionsList.vue'

const router = useRouter()

async function goBack() {
  await router.push({ name: '/' })
}
</script>

<style scoped>
.transactions-topbar {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 12px 16px 4px;
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
}
</style>
