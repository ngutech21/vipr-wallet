<template>
  <transition
    appear
    enter-active-class="animated slideInLeft"
    leave-active-class="animated slideOutLeft"
  >
    <q-layout view="lHh Lpr lFf">
      <q-page-container>
        <q-page class="column dark-gradient">
          <q-toolbar class="header-section">
            <q-btn flat round icon="arrow_back" :to="'/'" />
            <q-toolbar-title class="text-center no-wrap">Send</q-toolbar-title>
            <div class="q-ml-md" style="width: 40px"></div>
          </q-toolbar>
          <div class="q-px-md">
            <!-- Payment input section -->
            <template v-if="!decodedInvoice">
              <q-card flat bordered class="bg-dark q-mb-md">
                <q-card-section>
                  <div class="text-subtitle2 text-grey q-mb-sm">
                    Enter Lightning Invoice or Address
                  </div>
                  <q-input
                    v-model="lightningInvoice"
                    filled
                    autogrow
                    dense
                    dark
                    type="textarea"
                    placeholder="lnbc... or name@domain.com"
                    class="custom-input"
                  >
                    <template v-slot:after>
                      <q-btn round dense flat icon="qr_code_scanner" @click="openScanner" />
                    </template>
                  </q-input>

                  <div class="q-mt-md" v-if="hasCopiedText">
                    <q-btn
                      label="Paste"
                      icon="content_paste"
                      flat
                      color="primary"
                      @click="pasteFromClipboard"
                    />
                  </div>
                </q-card-section>
              </q-card>

              <!-- Amount input section (for lightning address) -->
              <q-slide-transition>
                <q-card v-if="amountRequired" flat bordered class="bg-dark q-mb-md">
                  <q-card-section>
                    <div class="text-subtitle2 text-grey q-mb-sm">Payment Details</div>

                    <div class="row q-col-gutter-md">
                      <div class="col-12">
                        <q-input
                          filled
                          dense
                          dark
                          v-model.number="invoiceAmount"
                          label="Amount in sats"
                          type="number"
                          class="custom-input"
                        />
                      </div>
                    </div>

                    <div class="row q-col-gutter-md q-mt-md">
                      <div class="col-12">
                        <q-input
                          filled
                          dense
                          dark
                          v-model="invoiceMemo"
                          label="Memo (optional)"
                          class="custom-input"
                        />
                      </div>
                    </div>
                  </q-card-section>
                </q-card>
              </q-slide-transition>

              <!-- Action button -->
              <div class="q-mt-lg">
                <q-btn
                  :label="amountRequired ? 'Create Invoice' : 'Continue'"
                  color="primary"
                  class="full-width q-py-sm"
                  size="lg"
                  :loading="isProcessing"
                  @click="amountRequired ? createInvoice() : decodeInvoice()"
                >
                  <!-- :disable="!isValidInput" -->
                  <template v-slot:loading>
                    <q-spinner-dots color="white" />
                  </template>
                </q-btn>
              </div>
            </template>

            <!-- Show payment verification component if invoice is decoded -->
            <VerifyPayment
              v-else
              :decoded-invoice="decodedInvoice"
              @cancel="decodedInvoice = null"
              @pay="payInvoice"
            />
          </div>
        </q-page>
      </q-page-container>
    </q-layout>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useWalletStore } from 'src/stores/wallet'
import { useLightningStore } from 'src/stores/lightning'
import { useQuasar, Loading } from 'quasar'
import VerifyPayment from 'components/VerifyPayment.vue'
import type { Bolt11Invoice } from 'src/components/models'
import { useRoute, useRouter } from 'vue-router'
import type { SendRouteQuery } from 'src/types/vue-router'
import { useTransactionsStore } from 'src/stores/transactions'
import { useFederationStore } from 'src/stores/federation'
import { getErrorMessage } from 'src/utils/error'
import { LightningAddress } from '@getalby/lightning-tools'
import { logger } from 'workbox-core/_private'

const lightningInvoice = ref('')
const decodedInvoice = ref<Bolt11Invoice | null>(null)
const store = useWalletStore()
const lightningStore = useLightningStore()
const $q = useQuasar()
const route = useRoute()
const router = useRouter()
const query = route.query as SendRouteQuery
const transactionsStore = useTransactionsStore()
const federationsStore = useFederationStore()
const invoiceAmount = ref(0)
const invoiceMemo = ref('')
const lnAdress = ref<LightningAddress | null>(null)
const isProcessing = ref(false)
const hasCopiedText = ref(false)

// determine if the amount is required e.g. when paying a lightning address or lnurl-p
const amountRequired = ref(false)

// FIXME
// Validate input before allowing to continue
// const isValidInput = computed(() => {
//   if (amountRequired.value) {
//     return invoiceAmount.value > 0 && lightningInvoice.value.includes('@')
//   }
//   return lightningInvoice.value.trim().startsWith('lnbc')
// })

onMounted(async () => {
  await checkClipboard()
})

// Watch for query params
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

// Check clipboard for invoice
async function checkClipboard() {
  try {
    if ('clipboard' in navigator) {
      const text = await navigator.clipboard.readText()
      hasCopiedText.value = text.startsWith('lnbc') || text.includes('@')
    }
  } catch (e) {
    // Clipboard access may be restricted
    console.log('Could not access clipboard', e)
  }
}

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    if (text.startsWith('lnbc') || text.includes('@')) {
      lightningInvoice.value = text.trim()
      hasCopiedText.value = false

      if (text.startsWith('lnbc')) {
        await decodeInvoice()
      }
    }
  } catch (e) {
    logger.error('Could not access clipboard ', e)
    $q.notify({
      type: 'negative',
      message: 'Could not access clipboard',
    })
  }
}

async function openScanner() {
  await router.push('/scan')
}

async function createInvoice() {
  try {
    isProcessing.value = true
    Loading.show({ message: 'Creating invoice...' })

    const invoice = await lnAdress?.value?.requestInvoice({
      satoshi: invoiceAmount.value,
      comment: invoiceMemo.value,
    })

    if (invoice) {
      lightningInvoice.value = invoice.paymentRequest
      decodedInvoice.value = lightningStore.decodeInvoice(lightningInvoice.value)
    }
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: `Failed to create invoice: ${getErrorMessage(error)}`,
      position: 'top',
    })
  } finally {
    isProcessing.value = false
    Loading.hide()
  }
}

async function decodeInvoice() {
  isProcessing.value = true

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

  isProcessing.value = false
}

async function payInvoice() {
  try {
    isProcessing.value = true
    Loading.show({ message: 'Processing payment...' })

    const paymentResult = await store.wallet?.lightning.payInvoice(lightningInvoice.value)

    const amountInSats = decodedInvoice.value?.amount ? decodedInvoice.value.amount : 0
    await transactionsStore.addSendTransaction({
      amountInSats,
      federationId: federationsStore.selectedFederation?.federationId ?? 'unknown',
      createdAt: new Date(),
      invoice: lightningInvoice.value,
      status: 'completed',
      amountInFiat: await lightningStore.satsToFiat(amountInSats),
      fiatCurrency: 'usd',
      ...(paymentResult?.fee !== undefined ? { feeInMsats: paymentResult.fee } : {}),
    })

    await store.updateBalance()

    $q.notify({
      type: 'positive',
      message: 'Payment successful!',
      position: 'top',
    })

    await router.push('/')
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: `Failed to pay invoice: ${getErrorMessage(error)}`,
      position: 'top',
    })
  } finally {
    isProcessing.value = false
    Loading.hide()
  }
}
</script>

<style scoped>
.custom-input :deep(.q-field__control) {
  background-color: rgba(255, 255, 255, 0.05);
}

.custom-input :deep(.q-field__native),
.custom-input :deep(.q-field__prefix),
.custom-input :deep(.q-field__suffix),
.custom-input :deep(.q-field__input) {
  color: white;
}

.text-grey {
  color: #9e9e9e;
}

.bg-dark {
  background-color: rgba(255, 255, 255, 0.03);
}
</style>
