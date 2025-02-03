<template>
  <q-page class="row items-center justify-evenly">
    <q-btn label="Scan QR Code" color="primary" :to="'/scan'" />
    <q-btn label="Join" color="primary" @click="joinFedimint()" />
    <q-dialog
      v-model="showSettingsOverlay"
      position="bottom"
      transition-show="slide-up"
      transition-hide="slide-down"
      class="full-width-dialog"
    >
      <SettingsPage @close="showSettingsOverlay = false" />
    </q-dialog>

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
import { ref } from 'vue'
import SettingsPage from 'components/SettingsPage.vue'
import { FedimintWallet } from '@fedimint/core-web'
const showSettingsOverlay = ref(false)

async function joinFedimint() {
  // Create the Wallet client
  const wallet = new FedimintWallet()

  // Open the wallet (should be called once in the application lifecycle)
  await wallet.open()

  // Join a Federation (if not already open)
  if (!wallet.isOpen()) {
    const inviteCode =
      // mutinynet invite code
      'fed11qgqrgvnhwden5te0v9k8q6rp9ekh2arfdeukuet595cr2ttpd3jhq6rzve6zuer9wchxvetyd938gcewvdhk6tcqqysptkuvknc7erjgf4em3zfh90kffqf9srujn6q53d6r056e4apze5cw27h75'
    await wallet.joinFederation(inviteCode)
  }

  // Get Wallet Balance
  const balance = await wallet.balance.getBalance()
  console.log('Wallet Balance:', balance)
  const amount: number = 1000
  const description: string = 'Test Invoice'
  const invoice = await wallet.lightning.createInvoice(amount, description)
  console.log('Invoice:', invoice)
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
</style>
