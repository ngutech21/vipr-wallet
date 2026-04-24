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

    <q-page class="dark-gradient receive-page" data-testid="receive-page">
      <div class="receive-topbar">
        <q-btn
          flat
          round
          icon="arrow_back"
          @click="goBack"
          class="receive-topbar__back"
          data-testid="receive-back-btn"
        />
      </div>

      <div class="receive-content">
        <div class="flex flex-center full-width">
          <div v-if="!qrData" class="amount-entry-container q-pa-lg task-card">
            <AmountDisplay :value="formattedAmount" class="q-mb-lg" data-testid="amount-input" />

            <NumericKeypad :buttons="keypadButtons" class="q-mb-lg" />

            <q-btn
              label="Create Invoice"
              color="primary"
              class="full-width receive-action-btn"
              :disable="amount <= 0 || isCreatingInvoice"
              @click="onRequest"
              icon="bolt"
              :loading="isCreatingInvoice"
              data-testid="receive-create-invoice-btn"
              :data-busy="isCreatingInvoice ? 'true' : 'false'"
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
          <q-card v-if="qrData" class="qr-card task-card" data-testid="receive-qr-container">
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
              <div class="invoice-row">
                <q-input
                  v-model="qrData"
                  readonly
                  filled
                  dense
                  class="col invoice-input receive-input"
                  data-testid="receive-invoice-input"
                />
                <q-btn
                  icon="content_copy"
                  flat
                  round
                  @click="copyToClipboard"
                  data-testid="receive-copy-invoice-btn"
                />
                <q-btn
                  icon="share"
                  flat
                  round
                  @click="shareQrcode"
                  v-if="isSupported"
                  data-testid="receive-share-invoice-btn"
                />
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

        <div class="row justify-center q-mt-lg">
          <q-btn
            v-if="qrData"
            label="Pay with Bitcoin wallet"
            color="primary"
            icon="account_balance_wallet"
            class="receive-wallet-btn"
            @click="payWithBitcoinConnect"
            data-testid="receive-pay-with-wallet-btn"
          />
        </div>
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
import AmountDisplay from 'src/components/AmountDisplay.vue'
import NumericKeypad from 'src/components/NumericKeypad.vue'
import { useAppNotify } from 'src/composables/useAppNotify'
import { useLightningPayment } from 'src/composables/useLightningPayment'
import { useNumericInput } from 'src/composables/useNumericInput'
import { getErrorMessage } from 'src/utils/error'

const qrData = ref('')
const router = useRouter()
const lnExpiry = 60 * 20 // 20 minutes
const countdown = ref(lnExpiry)
const isWaiting = ref(false)
const { share, isSupported } = useShare()
const isCreatingInvoice = ref(false)
const federationStore = useFederationStore()
const notify = useAppNotify()

// Use the lightning payment composable
const { createInvoice, waitForInvoicePayment } = useLightningPayment()

// Use the numeric input composable
const { value: amount, keypadButtons } = useNumericInput(0)
const formattedAmount = computed(() => amount.value.toLocaleString())

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
})

onUnmounted(() => {
  clearCountdownTimer()
})

async function payWithBitcoinConnect() {
  Loading.show({ message: 'Paying with connected Bitcoin wallet' })
  try {
    const provider = await requestProvider()

    if (provider == null) {
      throw new Error('No Bitcoin wallet provider available')
    }

    await provider.sendPayment(qrData.value)
    logger.logTransaction('Payment sent via Bitcoin Connect')
  } catch (error) {
    logger.error('Failed to pay with Bitcoin Connect', error)
    notify.error(`Failed to pay with connected wallet: ${getErrorMessage(error)}`)
  } finally {
    Loading.hide()
  }
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
.receive-page {
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
}

.receive-topbar {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: calc(12px + env(safe-area-inset-top)) 16px 4px;
}

.receive-topbar__back {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.receive-content {
  width: 100%;
  padding: 0 16px 24px;
}

.task-card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.025));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
}

.amount-entry-container {
  width: 100%;
  max-width: 560px;
}

.entry-title {
  margin-bottom: 16px;
  font-size: 1.05rem;
  font-weight: 600;
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
  max-width: 560px;
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

.invoice-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.invoice-input {
  min-width: 0;
}

.receive-input :deep(.q-field__control) {
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
}

.receive-input :deep(.q-field__native),
.receive-input :deep(.q-field__input) {
  color: white;
  white-space: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  text-overflow: ellipsis;
}

.receive-action-btn,
.receive-wallet-btn {
  min-height: 54px;
  border-radius: 18px;
}
</style>
