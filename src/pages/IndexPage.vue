<template>
  <q-page class="column">
    <div class="text-white q-pa-md dark-bg" style="width: 100%">
      <div class="text-h4 text-center">
        {{ totalBalance }}
        <q-icon name="fa-solid fa-bitcoin-sign" />
      </div>

      <div class="text-center" v-if="selectedFederation">
        <q-chip class="q-mt-sm" color="white" text-color="primary" outline>
          <q-icon name="account_balance" class="q-mr-sm" />
          {{ selectedFederation?.title }}
        </q-chip>
      </div>
    </div>

    <TransactionsList />

    <!-- Added fixed bottom buttons using q-page-sticky -->
    <q-page-sticky position="bottom" :offset="[16, 16]">
      <div class="q-pa-md">
        <div class="row items-center justify-evenly q-gutter-md">
          <q-btn label="Send" icon="arrow_upward" color="primary" :to="'/send'" />
          <q-btn label="" color="primary" icon="qr_code_scanner" :to="'/scan'" />
          <q-btn label="Receive" icon="arrow_downward" color="primary" :to="'/receive'" />
        </div>
      </div>
    </q-page-sticky>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useFederationStore } from 'src/stores/federation'
import { useWalletStore } from 'src/stores/wallet'
import TransactionsList from 'src/components/TransactionsList.vue'

const federationStore = useFederationStore()
const selectedFederation = computed(() => federationStore.selectedFederation)
const walletStore = useWalletStore()
const totalBalance = computed(() => walletStore.balance)

onMounted(() => {
  console.log('Joining Fedimint...')
  federationStore.loadSelectedFederation()
})
</script>

<style scoped>
/* Target the q-btn that has the .small-label class */
.q-btn.small-label .q-btn__content .q-btn__label {
  font-size: 0.75rem !important;
  text-align: center;
}
.word-wrap {
  word-wrap: break-word;
  white-space: normal;
}
.dark-bg {
  background-color: #202020;
}
</style>
