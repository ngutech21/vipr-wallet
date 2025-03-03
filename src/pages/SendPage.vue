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
              label="Enter Lightning Invoice or Lightning address"
              type="textarea"
              autogrow
            />
          </div>
          <q-btn label="Next" color="primary" @click="decodeInvoice" v-if="!amountRequired" />

          <div v-if="amountRequired" class="q-mb-md">
            <q-input
              filled
              v-model="invoiceAmount"
              label="Amount in sats"
              type="number"
              autogrow
              :rules="[(val) => val > 0 || 'Enter a positive amount']"
            />
            <q-input
              filled
              v-model="invoiceMemo"
              label="Memo"
              type="text"
              autogrow
              class="q-mt-md"
            />
            <q-btn label="Next" color="primary" @click="createInvoice" class="q-mt-md" />
          </div>
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
import { getErrorMessage } from 'src/utils/error'
import { LightningAddress } from '@getalby/lightning-tools'

const lightningInvoice = ref('')
const decodedInvoice = ref<Bolt11Invoice | null>(null)
const store = useWalletStore()
const lightningStore = useLightningStore()
const $q = useQuasar()
const route = useRoute()
const query = route.query as SendRouteQuery
const transactionsStore = useTransactionsStore()
const federationsStore = useFederationStore()
const invoiceAmount = ref(0)
const invoiceMemo = ref('')
const lnAdress = ref(<LightningAddress | null>null)

// determine if the amount is required e.g. when paying a lightning address or lnurl-p
const amountRequired = ref(false)

watch(
  () => query.invoice,
  async (newInvoice) => {
    if (typeof newInvoice === 'string') {
      lightningInvoice.value = newInvoice
      await decodeInvoice()
    }
  },
  { immediate: true },
)

async function createInvoice() {
  const invoice = await lnAdress?.value?.requestInvoice({
    satoshi: invoiceAmount.value,
    comment: invoiceMemo.value,
  })
  if (invoice) {
    lightningInvoice.value = invoice.paymentRequest
    decodedInvoice.value = lightningStore.decodeInvoice(lightningInvoice.value)
  }
}

async function decodeInvoice() {
  if (lightningInvoice.value.includes('@')) {
    amountRequired.value = true
    lnAdress.value = new LightningAddress(lightningInvoice.value)
    try {
      await lnAdress.value.fetchWithProxy()
      if (!lnAdress.value.lnurlpData) {
        amountRequired.value = false
        lnAdress.value = null
        $q.notify({
          type: 'negative',
          message: 'Invalid lightning address',
          position: 'top',
        })
      }
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: `Failed to fetch lightning address: ${getErrorMessage(error)}`,
        position: 'top',
      })
    }
  } else {
    try {
      decodedInvoice.value = lightningStore.decodeInvoice(lightningInvoice.value)
    } catch (error) {
      $q.notify({
        type: 'negative',
        message: `Failed to decode invoice: ${getErrorMessage(error)}`,
        position: 'top',
      })
    }
  }
}

async function payInvoice() {
  try {
    await store.wallet?.lightning.payInvoice(lightningInvoice.value)

    const amountInSats = decodedInvoice.value?.amount ? decodedInvoice.value.amount : 0
    await transactionsStore.addSendTransaction({
      amountInSats,
      federationId: federationsStore.selectedFederation?.federationId ?? 'unknown',
      createdAt: new Date(),
      invoice: lightningInvoice.value,
      status: 'completed',
      amountInFiat: await lightningStore.satsToFiat(amountInSats),
      fiatCurrency: 'usd',
    })

    $q.notify({
      type: 'positive',
      message: 'Invoice paid successfully!',
      position: 'top',
    })
    console.log('Invoice paid successfully:', lightningInvoice.value)
  } catch (error) {
    console.log('Error Invoice paid ', error)
    $q.notify({
      type: 'negative',
      message: `Failed to pay invoice: ${getErrorMessage(error)}`,
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
