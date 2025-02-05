<!-- filepath: /Users/steffen/projects/serpnt-wallet/src/pages/SendPage.vue -->
<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page padding>
        <!-- Back button to go to IndexPage -->
        <q-btn icon="arrow_back" label="Back" flat class="q-mb-lg" :to="'/'" />

        <!-- Enter Lightning Invoice -->
        <div class="q-mb-md">
          <q-input
            filled
            v-model="lightningInvoice"
            label="Enter Lightning Invoice"
            type="textarea"
            autogrow
          />
        </div>

        <!-- Pay button -->
        <q-btn label="Pay Invoice" color="primary" @click="payInvoice" />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useFedimintStore } from 'src/stores/fedimint'
import { useQuasar } from 'quasar'

const lightningInvoice = ref('')
const store = useFedimintStore()
const $q = useQuasar()

// function validateInvoice() {
//   // Simple validation for Lightning invoice (you can improve this)
//   //isValidInvoice.value = lightningInvoice.value.startsWith('ln')
//   return true
// }

async function payInvoice() {
  try {
    await store.wallet?.lightning.payInvoice(lightningInvoice.value)
    $q.notify({
      type: 'positive',
      message: 'Invoice paid successfully!',
    })
    console.log('Invoice paid successfully:', lightningInvoice.value)
  } catch (error) {
    console.log('Error Invoice paid ', error)
    let errorMessage = 'An unknown error occurred.'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    $q.notify({
      type: 'negative',
      message: 'Failed to pay invoice: ' + errorMessage,
    })
  }
}
</script>

<style scoped>
.q-mb-md {
  margin-bottom: 16px;
}
</style>
