<template>
  <transition
    appear
    enter-active-class="animated slideInLeft"
    leave-active-class="animated slideOutLeft"
  >
    <!-- Only render layout if not leaving -->
    <q-layout v-if="!isLeaving" view="lHh Lpr lFf">
      <q-page-container>
        <q-page padding>
          <!-- Back button: remove :to, call goBack -->
          <q-btn icon="arrow_back" label="Back" flat class="q-mb-lg" @click="goBack" />

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
          <div v-if="qrData" class="column items-center justify-center h-6 heading-text">
            Pay the lightning invoice to receive your ecash
          </div>

          <!-- QR Code Card -->
          <div class="column items-center justify-center">
            <q-card v-if="qrData" class="qr-card">
              <q-card-section class="qr-container">
                <qrcode-vue
                  :value="qrData"
                  level="M"
                  render-as="svg"
                  :size="0"
                  class="responsive-qr"
                />
              </q-card-section>
              <q-separator />
              <q-card-section>
                <div class="row items-center q-gutter-sm">
                  <q-input v-model="qrData" readonly class="col" />
                  <q-btn icon="content_copy" flat @click="copyToClipboard" />
                  <q-btn icon="share" flat @click="shareQrcode" v-if="isSupported" />
                </div>
              </q-card-section>
            </q-card>
          </div>

          <!-- Payment Status -->
          <div v-if="qrData" class="column items-center justify-center q-mt-lg">
            <span class="highlight">{{ formattedCountdown }}</span>
            <span class="countdown-text">
              Waiting for Lightning payment...
              <q-spinner v-if="isWaiting" size="20px" class="q-ml-sm" />
            </span>
          </div>

          <!-- Request button -->
          <q-btn label="Create Invoice" color="primary" @click="onRequest" v-if="!qrData" />
        </q-page>
      </q-page-container>
    </q-layout>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import QrcodeVue from 'qrcode.vue'
import { useWalletStore } from 'src/stores/wallet'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { useLightningTransactionsStore } from 'src/stores/transactions'
import { useShare } from '@vueuse/core'

const amount = ref<number>(0)
const qrData = ref('')
const store = useWalletStore()
const amountInput = ref<HTMLInputElement | null>(null)
const $q = useQuasar()
const router = useRouter()
const lightningTransactionsStore = useLightningTransactionsStore()
const lnExpiry = 60 * 20 // 20 minutes
const countdown = ref(lnExpiry)
const isWaiting = ref(false)
const isLeaving = ref(false) // New flag to control transition

const { share, isSupported } = useShare()

const formattedCountdown = computed(() => {
  const minutes = Math.floor(countdown.value / 60)
  const seconds = countdown.value % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

onMounted(() => {
  if (amountInput.value) {
    amountInput.value.focus()
  }
})

async function shareQrcode() {
  console.log('Sharing QR code...')
  await share({
    title: 'Lightning Invoice for ${amount.value} sats',
    text: qrData.value,
  })
}

async function onRequest() {
  if (amount.value < 1) {
    return
  }

  const interval = setInterval(() => {
    if (countdown.value > 0) {
      countdown.value--
    } else {
      clearInterval(interval)
    }
  }, 1000)

  console.log('Requesting amount:', amount.value)
  const invoiceAmount = amount.value * 1_000

  const invoice = await store.wallet?.lightning.createInvoice(
    invoiceAmount,
    'minting ecash',
    lnExpiry,
  )
  console.log('Invoice:', invoice)

  if (invoice) {
    qrData.value = invoice.invoice
    isWaiting.value = true
    console.log('Invoice:', invoice.invoice)

    try {
      await store.wallet?.lightning
        .waitForReceive(invoice.operation_id, lnExpiry * 1_000)
        .then((lnReceiveState) => {
          console.log('Received invoice:', lnReceiveState)

          // TODO show nicer notification
          $q.notify({
            message: 'Received payment!',
            color: 'positive',
            position: 'top',
          })
        })
      await lightningTransactionsStore.addTransaction({
        amountInSats: amount.value,
        createdAt: new Date(),
        invoice: invoice.invoice,
      })
      await store.updateBalance()
    } catch (e) {
      let errorMessage = 'An unknown error occurred.'
      if (e instanceof Error) {
        errorMessage = e.message
      } else if (typeof e === 'string') {
        errorMessage = e
      }
      $q.notify({
        message: `Error receiving payment: ${errorMessage}`,
        color: 'negative',
        position: 'top',
      })
    } finally {
      isWaiting.value = false
    }
    await router.push({ path: '/' })
  }
}

async function copyToClipboard() {
  await navigator.clipboard.writeText(qrData.value)
}

async function goBack() {
  isLeaving.value = true
  await new Promise((resolve) => setTimeout(resolve, 500)) // delay to allow the animation to play
  await router.push({ path: '/' })
}
</script>

<style scoped>
.input-width {
  width: 100%;
  max-width: 512px;
}

.heading-text {
  margin-bottom: 10px;
}

.countdown-text {
  font-size: 1.25rem;
  margin-top: 10px;
}

.highlight {
  font-size: 1.5rem;
  color: var(--q-positive);
  font-weight: bold;
  margin-top: 10px;
}

.qr-card {
  width: 100%;
  max-width: 512px;
  margin-bottom: 0;
}

.qr-container {
  aspect-ratio: 1;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.responsive-qr {
  width: 100%;
  height: 100%;
}
</style>
