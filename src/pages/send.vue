<template>
  <transition
    appear
    enter-active-class="animated slideInLeft"
    leave-active-class="animated slideOutLeft"
  >
    <q-page class="column dark-gradient">
      <q-toolbar class="header-section">
        <q-btn flat round icon="arrow_back" :to="{ name: '/' }" data-testid="send-back-btn" />
        <q-toolbar-title class="text-center no-wrap">Send</q-toolbar-title>
        <div class="q-ml-md" style="width: 40px"></div>
      </q-toolbar>
      <div class="q-px-md">
        <!-- Payment input section -->
        <template v-if="!decodedInvoice">
          <q-card flat class="glass-effect q-mb-md">
            <q-card-section>
              <q-input
                v-model="lightningInvoice"
                filled
                autogrow
                dense
                dark
                type="textarea"
                placeholder="Enter Lightning Invoice, Address or LNURL"
                class="custom-input"
                data-testid="send-invoice-input"
              >
                <template #after>
                  <q-btn
                    round
                    dense
                    flat
                    icon="qr_code_scanner"
                    @click="openScanner"
                    data-testid="send-open-scanner-btn"
                  />
                </template>
              </q-input>
            </q-card-section>
          </q-card>

          <!-- Amount input section (for lightning address) -->
          <q-slide-transition>
            <q-card v-if="amountRequired" flat bordered class="glass-effect q-mb-md">
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
                      data-testid="send-amount-input"
                    />
                  </div>
                </div>

                <div class="row q-col-gutter-md q-mt-md" v-if="lnAddress">
                  <div class="col-12">
                    <q-input
                      filled
                      dense
                      dark
                      v-model="invoiceMemo"
                      label="Memo (optional)"
                      class="custom-input"
                      data-testid="send-memo-input"
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
              :disable="isProcessing"
              @click="amountRequired ? createInvoice() : decodeInvoice()"
              data-testid="send-continue-btn"
              :data-busy="isProcessing ? 'true' : 'false'"
            >
              <!-- :disable="!isValidInput" -->
              <template #loading>
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
  </transition>
</template>

<script setup lang="ts">
defineOptions({
  name: 'SendPage',
})

import { ref, watch } from 'vue'
import VerifyPayment from 'components/VerifyPayment.vue'
import { useRoute, useRouter } from 'vue-router'
import { useInvoiceDecoding } from 'src/composables/useInvoiceDecoding'
import { useLightningPayment } from 'src/composables/useLightningPayment'

const lightningInvoice = ref('')

const route = useRoute('/send')
const router = useRouter()
const invoiceAmount = ref(0)
const invoiceMemo = ref('')

// Use the invoice decoding composable
const {
  isProcessing,
  amountRequired,
  lnAddress,
  decodedInvoice,
  decodeInvoice: decodeInvoiceFromComposable,
  createInvoiceFromInput,
} = useInvoiceDecoding()

// Use the lightning payment composable
const { payInvoice: payInvoiceFromComposable } = useLightningPayment()

// FIXME
// Validate input before allowing to continue
// const isValidInput = computed(() => {
//   if (amountRequired.value) {
//     return invoiceAmount.value > 0 && lightningInvoice.value.includes('@')
//   }
//   return lightningInvoice.value.trim().startsWith('lnbc')
// })

// Watch for query params
watch(
  () => route.query.invoice,
  async (newInvoice) => {
    const invoiceValue = Array.isArray(newInvoice) ? newInvoice[0] : newInvoice
    if (typeof invoiceValue === 'string') {
      if (invoiceValue.startsWith('web+lightning:') || invoiceValue.startsWith('lightning:')) {
        lightningInvoice.value = invoiceValue
          .replace('web+lightning:', '')
          .replace('lightning:', '')
      } else {
        lightningInvoice.value = invoiceValue
      }
      await decodeInvoice()
    }
  },
  { immediate: true },
)

async function decodeInvoice() {
  await decodeInvoiceFromComposable(lightningInvoice.value)
}

async function openScanner() {
  await router.push({ name: '/scan' })
}

async function createInvoice() {
  await createInvoiceFromInput(lightningInvoice.value, invoiceAmount.value, invoiceMemo.value)
}

async function payInvoice() {
  const amountInSats = decodedInvoice.value?.amount ?? 0

  const result = await payInvoiceFromComposable(lightningInvoice.value, amountInSats)

  if (result.success) {
    await router.push({
      path: '/sent-lightning',
      query: { amount: result.amountSats, fee: result.fee },
    })
  }
}
</script>

<style scoped>
.entry-container {
  width: 100%;
  max-width: 500px;
  border-radius: 16px;
}

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
