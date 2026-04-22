<template>
  <transition
    appear
    enter-active-class="animated slideInLeft"
    leave-active-class="animated slideOutLeft"
  >
    <q-page class="transactions-page dark-gradient" data-testid="transactions-page">
      <div
        v-touch-swipe.right.mouse="goBack"
        class="page-swipe-edge"
        aria-hidden="true"
        data-testid="transactions-swipe-edge"
      ></div>

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
  await router.replace({ name: '/' })
}
</script>

<style scoped>
.transactions-page {
  position: relative;
}

.page-swipe-edge {
  position: absolute;
  inset: 0 auto 0 0;
  width: 28px;
  z-index: 2;
}

.transactions-topbar {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 12px 16px 4px;
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
}
</style>
