<route lang="yaml">
meta:
  hideBottomNav: true
</route>

<template>
  <transition
    appear
    enter-active-class="animated slideInLeft"
    leave-active-class="animated slideOutLeft"
  >
    <q-page class="transactions-page dark-gradient" data-testid="transactions-page">
      <q-toolbar class="header-section">
        <q-btn flat round icon="arrow_back" @click="goBack" data-testid="transactions-back-btn" />
        <q-toolbar-title class="text-center no-wrap">Transaction History</q-toolbar-title>
        <div class="q-ml-md" style="width: 40px"></div>
      </q-toolbar>

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
