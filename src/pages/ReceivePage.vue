<!-- filepath: /Users/steffen/projects/serpnt-wallet/src/pages/ReceivePage.vue -->
<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page padding>
        <!-- Back button to go to IndexPage -->
        <q-btn icon="arrow_back" label="Back" flat class="q-mb-lg" :to="'/'" />

        <!-- Enter amount textfield -->
        <div class="q-mb-md" v-if="!qrData">
          <q-input
            filled
            v-model.number="amount"
            label="Amount (Sats)"
            type="number"
            ref="amountInput"
          />
        </div>
        <div class="h-6 heading-text">Pay the lightning invoice to receive your ecash.</div>

        <!-- QR Code Card -->
        <q-card v-if="qrData" class="input-width">
          <q-card-section>
            <qrcode-vue :value="qrData" :size="480" level="M" bgColor="#ffffff" fgColor="#000000" />
            <q-card-section class="row">
              <q-input filled v-model="qrData" label="Lightning Invoice" readonly class="col-10" />
              <q-btn icon="content_copy" label="Copy" flat @click="copyToClipboard" class="col-2" />
            </q-card-section>
          </q-card-section>
        </q-card>

        <!-- Request button -->
        <q-btn label="Create Invoice" color="primary" @click="onRequest" v-if="!qrData" />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import QrcodeVue from 'qrcode.vue'
import { useFedimintStore } from 'src/stores/fedimint'

const amount = ref<number>(0)
const qrData = ref('')
const store = useFedimintStore()
const amountInput = ref<HTMLInputElement | null>(null)

onMounted(() => {
  if (amountInput.value) {
    amountInput.value.focus()
  }
})

async function onRequest() {
  // Handle request logic here

  if (amount.value < 1) {
    return
  }

  console.log('Requesting amount:', amount.value)
  const invoice = await store.wallet?.lightning.createInvoice(amount.value * 1_000, 'minting ecash')

  if (invoice) {
    qrData.value = invoice.invoice
    console.log('Invoice:', invoice.invoice)
  }
}

async function copyToClipboard() {
  await navigator.clipboard.writeText(qrData.value)
}
</script>

<style scoped>
.input-width {
  width: 100%;
  max-width: 512px;
}

.heading-text {
  font-size: 1.5rem; /* Adjust the font size as needed */
}
</style>
