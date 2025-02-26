<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page padding>
        <q-btn icon="arrow_back" label="Back" flat class="q-mb-lg" :to="'/'" />

        <template v-if="!decodedInvoice">
          <div class="q-mb-md">
            <q-input
              filled
              v-model="lightningInvoice"
              label="Enter Lightning Invoice"
              type="textarea"
              autogrow
            />
          </div>
          <q-btn label="Verify Invoice" color="primary" @click="decodeInvoice" />
        </template>

        <VerifyPayment
          v-else
          :decoded-invoice="decodedInvoice"
          @cancel="decodedInvoice = null"
          @pay="payInvoice"
        />
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useWalletStore } from 'src/stores/wallet'
import { useLightningStore } from 'src/stores/lightning'
import { useQuasar } from 'quasar'

import VerifyPayment from 'components/VerifyPayment.vue'
import type { Bolt11Invoice } from 'src/components/models'
import { useRoute } from 'vue-router'
import type { SendRouteQuery } from 'src/types/vue-router'
import { useTransactionsStore } from 'src/stores/transactions'
import { useFederationStore } from 'src/stores/federation'

const lightningInvoice = ref('')
const decodedInvoice = ref<Bolt11Invoice | null>(null)
const store = useWalletStore()
const lightningStore = useLightningStore()
const $q = useQuasar()
const route = useRoute()
const query = route.query as SendRouteQuery

const transactionsStore = useTransactionsStore()

const federationsStore = useFederationStore()

watch(
  () => query.invoice,
  (newInvoice) => {
    if (typeof newInvoice === 'string') {
      lightningInvoice.value = newInvoice
      decodeInvoice()
    }
  },
  { immediate: true },
)

function decodeInvoice() {
  try {
    decodedInvoice.value = lightningStore.decodeInvoice(lightningInvoice.value)
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error instanceof Error ? error.message : 'Failed to decode invoice',
      position: 'top',
    })
  }
}

async function payInvoice() {
  try {
    await store.wallet?.lightning.payInvoice(lightningInvoice.value)

    await transactionsStore.addSendTransaction({
      amountInSats: decodedInvoice.value?.amount ? decodedInvoice.value.amount / 1_000 : 0,
      federationId: federationsStore.selectedFederation?.federationId ?? 'unknown',
      createdAt: new Date(),
      invoice: lightningInvoice.value,
      status: 'completed',
    })

    $q.notify({
      type: 'positive',
      message: 'Invoice paid successfully!',
      position: 'top',
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
      position: 'top',
    })
  }
}
</script>

<style scoped>
.q-mb-md {
  margin-bottom: 16px;
}
</style>
