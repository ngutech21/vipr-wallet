<template>
  <q-page class="row items-center justify-evenly">
    <!-- show balance in a card-->
    <q-card
      class="q-ma-md"
      style="width: 300px; position: absolute; top: 10px; left: 50%; transform: translateX(-50%)"
    >
      <q-card-section class="text-h6">Total Balance</q-card-section>
      <q-card-section class="text-h4">{{ totalBalance }} (Sats)</q-card-section>
    </q-card>

    <q-card class="q-ma-md" style="width: 200px">
      <q-card-section class="text-h6">Federation ID</q-card-section>
      <q-card-section class="word-wrap">{{ federationId }}</q-card-section>
    </q-card>

    <div cols="12" class="q-mb-md">
      <q-input
        filled
        v-model="inviteCode"
        label="Your Invite Code"
        class="q-pa-md q-input-lg word-wrap"
      />
      <q-btn label="Join" color="primary" @click="joinFedimint()" />
    </div>

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
      <!-- Invite code input -->

      <!-- Buttons row -->
      <div cols="12" class="row items-center justify-evenly">
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
import { onMounted, ref } from 'vue'
import SettingsPage from 'pages/SettingsPage.vue'
import { useFedimintStore } from 'src/stores/fedimint'

const showSettingsOverlay = ref(false)
// const inviteCode = ref(
//   'fed11qgqrgvnhwden5te0v9k8q6rp9ekh2arfdeukuet595cr2ttpd3jhq6rzve6zuer9wchxvetyd938gcewvdhk6tcqqysptkuvknc7erjgf4em3zfh90kffqf9srujn6q53d6r056e4apze5cw27h75',
// )
const inviteCode = ref(
  'fed11qgqzygrhwden5te0v9cxjtnzd96xxmmfdec8y6twvd5hqmr9wvhxuet59upqzg9jzp5vsn6mzt9ylhun70jy85aa0sn7sepdp4fw5tjdeehah0hfmufvlqem',
)

const totalBalance = ref(0)
const federationId = ref('')

const store = useFedimintStore()

// const unsubscribe = wallet.balance.subscribeBalance((balance: number) => {
//   // notwoslash
//   console.log('Updated balance:', balance)
// })

onMounted(async () => {
  console.log('Joining Fedimint...')
  await joinFedimint()
})

async function joinFedimint() {
  // Create the Wallet client

  const code = inviteCode.value

  // Join a Federation (if not already open)
  if (!store.wallet?.isOpen()) {
    await store.wallet?.joinFederation(code)
  }

  federationId.value = (await store.wallet?.federation.getFederationId()) ?? ''

  // Get Wallet Balance
  const balance = ((await store.wallet?.balance.getBalance()) ?? 0) / 1_000
  totalBalance.value = balance
  console.log('Wallet Balance:', balance)
}
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
