<template>
  <q-page class="column items-center justify-evenly">
    <q-card class="q-ma-md" style="width: 300px">
      <q-card-section class="text-h6">Total Balance</q-card-section>
      <q-card-section class="text-h4">{{ totalBalance }} (Sats)</q-card-section>

      <q-card-section class="word-wrap" v-if="selectedFederation"
        >Active Federation: {{ selectedFederation?.title }}</q-card-section
      >
    </q-card>

    <q-dialog
      v-model="showSettingsOverlay"
      position="bottom"
      transition-show="slide-up"
      transition-hide="slide-down"
      class="full-width-dialog"
    >
      <SettingsPage @close="showSettingsOverlay = false" />
    </q-dialog>

    <div class="q-col-gutter-md q-pa-md">
      <!-- Buttons row -->
      <div cols="12" class="row items-center justify-evenly q-gutter-md">
        <q-btn label="Send" icon="arrow_upward" color="primary" :to="'/send'" />
        <q-btn label="" color="primary" icon="qr_code_scanner" :to="'/scan'" />
        <q-btn label="Receive" icon="arrow_downward" color="primary" :to="'/receive'" />
      </div>
    </div>

    <div class="fixed-bottom-bar row no-wrap justify-between">
      <div class="button-container">
        <q-btn stack icon="home" label="Home" class="small-label" />
      </div>
      <div class="button-container">
        <q-btn stack icon="account_balance" label="Federations" class="small-label" />
      </div>
      <div class="button-container">
        <q-btn
          stack
          icon="settings"
          label="Settings"
          class="small-label"
          @click="showSettingsOverlay = true"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import SettingsPage from 'pages/SettingsPage.vue'
import { useFederationStore } from 'src/stores/federation'
import { useWalletStore } from 'src/stores/wallet'

const showSettingsOverlay = ref(false)

const federationStore = useFederationStore()
const selectedFederation = computed(() => federationStore.selectedFederation)

const walletStore = useWalletStore()
const totalBalance = ref(0)

const updateBalance = async () => {
  const balance = ((await walletStore.wallet?.balance.getBalance()) ?? 0) / 1_000
  totalBalance.value = balance
  const fedi = await walletStore.wallet?.federation.getFederationId()
  console.log('Balance updated:', balance, fedi)
}

onMounted(async () => {
  console.log('Joining Fedimint...')
  federationStore.loadSelectedFederation()
  await updateBalance()
})

watch(selectedFederation, async () => {
  await updateBalance()
})
</script>

<style scoped>
.fixed-bottom-bar {
  position: fixed;
  bottom: 0;
  width: 100%;
  border-top: 1px solid #ccc;
  padding: 5px;
  display: flex;
  align-items: center;
}

.button-container {
  flex: 1;
  display: flex;
  justify-content: center;
}

/* Target the q-btn that has the .small-label class */
.q-btn.small-label .q-btn__content .q-btn__label {
  font-size: 0.75rem !important;
  text-align: center;
}

.full-width-dialog .q-dialog__inner {
  width: 100vw;
  max-width: 100vw;
  margin: 0;
}
.word-wrap {
  word-wrap: break-word;
  white-space: normal;
}
</style>
