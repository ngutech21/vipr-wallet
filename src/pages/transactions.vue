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
      <ViprTopbar
        v-touch-swipe.right.mouse="goBack"
        topbar-class="transactions-topbar"
        button-test-id="transactions-back-btn"
        data-testid="transactions-swipe-zone"
        @back="goBack"
      />

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
import ViprTopbar from 'src/components/ViprTopbar.vue'

const router = useRouter()

async function goBack() {
  await router.replace({ name: '/' })
}
</script>

<style scoped>
.transactions-topbar {
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
}
</style>
