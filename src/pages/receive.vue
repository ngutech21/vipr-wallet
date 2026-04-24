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
              no-caps
              unelevated
              class="full-width vipr-btn vipr-btn--primary vipr-btn--lg"
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
        <div class="qr-card-shell">
          <q-card v-if="qrData" flat class="qr-card task-card" data-testid="receive-qr-container">
            <q-card-section class="qr-container">
              <div class="qr-surface">
                <qrcode-vue
                  :value="qrData"
                  level="M"
                  render-as="svg"
                  :size="0"
                  class="responsive-qr"
                />
              </div>
            </q-card-section>
            <q-separator class="qr-separator" />
            <q-card-section class="invoice-section">
              <div class="invoice-row">
                <div class="invoice-label" :title="qrData" data-testid="receive-invoice-input">
                  <span class="invoice-label__text">{{ qrData }}</span>
                </div>
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
                  data-testid="receive-share-invoice-btn"
                />
              </div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Payment Status -->
        <div v-if="qrData" class="receive-status">
          <div class="status-expiry">
            <div class="status-label">Expires in</div>
            <div class="status-time">{{ formattedCountdown }}</div>
          </div>
          <div class="status-message">
            <span>Waiting for Lightning payment</span>
          </div>
        </div>

        <div class="receive-actions">
          <q-btn
            v-if="qrData"
            label="Pay with Bitcoin wallet"
            color="primary"
            no-caps
            unelevated
            icon="account_balance_wallet"
            class="vipr-btn vipr-btn--primary vipr-btn--lg"
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
const lnExpiry = 60 * 59 // 59 minutes
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
  if (!isSupported.value) {
    await navigator.clipboard.writeText(qrData.value)
    notify.info('Invoice copied. Share is not available in this browser.')
    return
  }

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
  box-sizing: border-box;
  width: 100%;
  padding: 0 16px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.task-card {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.022)),
    rgba(15, 16, 22, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.075);
  border-radius: 24px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035);
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

.qr-card-shell {
  width: 100%;
  max-width: 600px;
  display: flex;
  justify-content: center;
}

.qr-card {
  width: 100%;
  margin-bottom: 14px;
  overflow: hidden;
}

.qr-container {
  box-sizing: border-box;
  width: 100%;
  aspect-ratio: 1;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-surface {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 4px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.responsive-qr {
  display: block;
  width: 100%;
  height: 100%;
}

.qr-separator {
  background: rgba(255, 255, 255, 0.075);
}

.invoice-section {
  padding: 12px 16px 14px;
}

.invoice-row {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.invoice-label {
  min-width: 0;
  flex: 1;
  min-height: 44px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  background-color: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.055);
  border-radius: 14px;
  color: white;
  font-size: 0.95rem;
  line-height: 1;
}

.invoice-label__text {
  display: block;
  min-width: 0;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.invoice-row :deep(.q-btn) {
  flex: 0 0 auto;
  color: rgba(255, 255, 255, 0.78);
}

.receive-status {
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: 18px;
  color: white;
  text-align: center;
}

.status-label {
  color: rgba(255, 255, 255, 0.52);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: uppercase;
}

.status-time {
  margin-top: 2px;
  color: var(--q-positive);
  font-size: 1.55rem;
  font-weight: 700;
  line-height: 1.1;
}

.status-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 0;
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.9rem;
  text-align: center;
}

.receive-actions {
  width: 100%;
  max-width: 420px;
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

@media (max-width: 520px) {
  .receive-content {
    padding-right: 12px;
    padding-left: 12px;
  }

  .qr-container {
    padding: 6px;
  }

  .qr-surface {
    padding: 3px;
    border-radius: 14px;
  }

  .invoice-section {
    padding: 10px 10px 12px;
  }

  .invoice-row {
    gap: 4px;
  }

  .invoice-label {
    min-height: 40px;
    padding: 0 12px;
    font-size: 0.86rem;
  }

  .invoice-row :deep(.q-btn) {
    width: 40px;
    min-width: 40px;
    height: 40px;
  }

  .status-message {
    font-size: 0.88rem;
  }

  .receive-actions {
    max-width: 100%;
  }

  .receive-actions :deep(.q-btn) {
    width: 100%;
  }
}
</style>
