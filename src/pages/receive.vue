<route lang="yaml">
meta:
  hideBottomNav: true
</route>

<template>
  <transition
    appear
    enter-active-class="animated slideInLeft"
    leave-active-class="animated slideOutLeft"
  >
    <!-- Only render layout if not leaving -->

    <q-page class="dark-gradient">
      <q-toolbar class="header-section">
        <q-btn flat round icon="arrow_back" @click="goBack" />
        <q-toolbar-title class="text-center no-wrap">Receive</q-toolbar-title>
        <div class="q-ml-md" style="width: 40px"></div>
      </q-toolbar>

      <div class="flex flex-center full-width">
        <div v-if="!qrData" class="amount-entry-container q-pa-lg glass-effect">
          <div class="text-h6 q-mb-md text-center">Enter Amount</div>

          <q-input
            filled
            v-model.number="amount"
            label="Amount (Sats)"
            type="number"
            ref="amountInput"
            class="no-spinner q-mb-lg"
            readonly
            :rules="[(val) => val > 0 || 'Enter a positive amount']"
            data-testid="amount-input"
          />

          <!-- Preset amount buttons -->
          <div class="row q-col-gutter-sm q-mb-lg">
            <div class="col-4" v-for="(button, index) in keypadButtons" :key="index">
              <q-btn
                outline
                color="white"
                class="full-width"
                :icon="button.icon"
                :label="button.label"
                @click="button.handler"
              />
            </div>
          </div>

          <q-btn
            label="Create Invoice"
            color="primary"
            class="full-width"
            :disable="amount <= 0"
            @click="onRequest"
            icon="bolt"
            :loading="isCreatingInvoice"
          >
            <template #loading>
              <q-spinner-dots color="white" />
            </template>
            <q-icon name="bolt" class="q-ml-sm" />
          </q-btn>
        </div>
      </div>

      <!-- QR Code Card -->
      <div class="column items-center justify-center">
        <q-card v-if="qrData" class="qr-card">
          <q-card-section class="qr-container">
            <qrcode-vue :value="qrData" level="M" render-as="svg" :size="0" class="responsive-qr" />
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
      <div v-if="qrData" class="column items-center justify-center q-mt-xs">
        <span class="highlight">{{ formattedCountdown }}</span>
        <span class="countdown-text">
          Waiting for Lightning payment...
          <q-spinner v-if="isWaiting" size="20px" class="q-ml-sm" />
        </span>
      </div>

      <!-- Request button -->
      <!-- <q-btn label="Create Invoice" color="primary" @click="onRequest" v-if="!qrData" /> -->
      <div class="row justify-center q-mt-lg">
        <q-btn
          v-if="qrData"
          label="Pay with Bitcoin Wallet"
          color="primary"
          icon="account_balance_wallet"
          @click="payWithBitcoinConnect"
        />
      </div>
    </q-page>
  </transition>
</template>

<script setup lang="ts">
defineOptions({
  name: 'ReceivePage',
})

import { ref, onMounted, onUnmounted, computed } from 'vue'
import QrcodeVue from 'qrcode.vue'
import { Loading } from 'quasar'
import { useRouter } from 'vue-router'
import { useShare } from '@vueuse/core'
import { init, requestProvider } from '@getalby/bitcoin-connect'
import { useFederationStore } from 'src/stores/federation'
import { logger } from 'src/services/logger'
import { useLightningPayment } from 'src/composables/useLightningPayment'
import { useNumericInput } from 'src/composables/useNumericInput'

const qrData = ref('')
const amountInput = ref<HTMLInputElement | null>(null)
const router = useRouter()
const lnExpiry = 60 * 20 // 20 minutes
const countdown = ref(lnExpiry)
const isWaiting = ref(false)
const { share, isSupported } = useShare()
const isCreatingInvoice = ref(false)
const federationStore = useFederationStore()

// Use the lightning payment composable
const { createInvoice, waitForInvoicePayment } = useLightningPayment()

// Use the numeric input composable
const { value: amount, keypadButtons } = useNumericInput(0)

let countdownInterval: ReturnType<typeof setInterval> | null = null

function clearCountdownTimer() {
  if (countdownInterval != null) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
}

function startCountdownTimer() {
  clearCountdownTimer()
  countdown.value = lnExpiry
  countdownInterval = setInterval(() => {
    if (countdown.value > 0) {
      countdown.value--
    } else {
      clearCountdownTimer()
    }
  }, 1000)
}

const formattedCountdown = computed(() => {
  const minutes = Math.floor(countdown.value / 60)
  const seconds = countdown.value % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

onMounted(() => {
  init({
    appName: 'Vipr Wallet',
  })

  if (amountInput.value != null) {
    amountInput.value.focus()
  }
})

onUnmounted(() => {
  clearCountdownTimer()
})

async function payWithBitcoinConnect() {
  const provider = await requestProvider()
  Loading.show({ message: 'Paying with connected Bitcoin Wallet' })
  await provider.sendPayment(qrData.value)
  logger.logTransaction('Payment sent via Bitcoin Connect')
  Loading.hide()
}

async function shareQrcode() {
  logger.ui.debug('Sharing Lightning invoice')
  await share({
    title: `Lightning Invoice for ${amount.value} sats`,
    text: qrData.value,
  })
}

async function onRequest() {
  if (federationStore.selectedFederation === null) {
    logger.error('No federation selected')
    return
  }

  if (amount.value < 1) {
    return
  }
  isCreatingInvoice.value = true
  startCountdownTimer()

  try {
    const invoiceResult = await createInvoice(amount.value, 'minting ecash', lnExpiry)

    if (
      invoiceResult.success &&
      invoiceResult.invoice != null &&
      invoiceResult.invoice !== '' &&
      invoiceResult.operationId != null &&
      invoiceResult.operationId !== ''
    ) {
      qrData.value = invoiceResult.invoice
      isWaiting.value = true

      const waitResult = await waitForInvoicePayment(invoiceResult.operationId, lnExpiry * 1_000)

      if (waitResult.success) {
        await router.push({
          name: '/received-lightning',
          query: { amount: amount.value.toString() },
        })
      }
    }
  } finally {
    isWaiting.value = false
    isCreatingInvoice.value = false
    clearCountdownTimer()
  }
}

async function copyToClipboard() {
  await navigator.clipboard.writeText(qrData.value)
}

async function goBack() {
  await new Promise((resolve) => {
    setTimeout(resolve, 500)
  }) // delay to allow the animation to play
  await router.push({ name: '/' })
}
</script>

<style scoped>
.amount-entry-container {
  width: 100%;
  max-width: 500px;
  border-radius: 16px;
}
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
