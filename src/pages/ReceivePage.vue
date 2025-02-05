<!-- filepath: /Users/steffen/projects/serpnt-wallet/src/pages/ReceivePage.vue -->
<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page padding>
        <!-- Back button to go to IndexPage -->
        <q-btn icon="arrow_back" label="Back" flat class="q-mb-lg" :to="'/'" />

        <!-- Enter amount textfield -->
        <div class="q-mb-md">
          <q-input filled v-model.number="amount" label="Amount" type="number" />
        </div>

        <!-- QR Code Card -->
        <q-card v-if="qrData">
          <q-card-section>
            <qrcode-vue :value="qrData" :size="512" level="M" bgColor="#ffffff" fgColor="#000000" />
            <q-card-section>
              <q-input filled v-model="qrData" label="Lightning Invoice" readonly />
              <q-btn icon="content_copy" label="Copy" flat @click="copyToClipboard" />
            </q-card-section>
          </q-card-section>
        </q-card>

        <!-- Request button -->
        <q-btn label="Request" color="primary" @click="onRequest" />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import QrcodeVue from 'qrcode.vue'
import { useFedimintStore } from 'src/stores/fedimint'

const amount = ref<number>(0)
const qrData = ref('')
const store = useFedimintStore()

async function onRequest() {
  // Handle request logic here

  console.log('Requesting amount:', amount.value)
  const invoice = await store.wallet?.lightning.createInvoice(amount.value, 'minting tokens')

  if (invoice) {
    qrData.value = invoice.invoice
    console.log('Invoice:', invoice.invoice)
  }
}

async function copyToClipboard() {
  await navigator.clipboard.writeText(qrData.value)
}
</script>
