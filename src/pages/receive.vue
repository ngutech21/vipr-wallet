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

    <q-page class="dark-gradient vipr-mobile-page receive-page" data-testid="receive-page">
      <div class="vipr-topbar receive-topbar">
        <q-btn
          flat
          round
          icon="arrow_back"
          @click="goBack"
          class="vipr-topbar__back receive-topbar__back"
          data-testid="receive-back-btn"
        />
      </div>

      <div class="receive-content">
        <div class="vipr-flow-center">
          <div
            v-if="!qrData"
            class="vipr-flow-panel vipr-flow-panel--padded task-card vipr-surface-card--strong"
          >
            <AmountDisplay
              :value="formattedAmount"
              class="vipr-flow-spacer-lg"
              data-testid="amount-input"
            />

            <q-input
              v-model="invoiceMemo"
              filled
              dark
              label="Memo"
              placeholder="Optional description"
              maxlength="160"
              class="vipr-input receive-memo-input vipr-flow-spacer-md"
              data-testid="receive-memo-input"
            />

            <NumericKeypad :buttons="keypadButtons" class="vipr-flow-spacer-lg" />

            <q-btn
              label="Create Invoice"
              color="primary"
              no-caps
              unelevated
              class="vipr-flow-action vipr-btn vipr-btn--primary vipr-btn--lg"
              :disable="!canCreateInvoice"
              @click="onRequest"
              icon="bolt"
              :loading="isCreatingInvoice"
              data-testid="receive-create-invoice-btn"
              :data-busy="isCreatingInvoice ? 'true' : 'false'"
            >
              <template #loading>
                <q-spinner-dots color="white" />
              </template>
            </q-btn>
          </div>
        </div>

        <!-- QR Code Card -->
        <div class="vipr-qr-card-shell">
          <q-card
            v-if="qrData"
            flat
            class="vipr-qr-card task-card vipr-surface-card--strong"
            data-testid="receive-qr-container"
          >
            <q-card-section class="vipr-qr-container">
              <div class="vipr-qr-surface">
                <qrcode-vue
                  :value="qrData"
                  level="M"
                  render-as="svg"
                  :size="0"
                  class="vipr-qr-code"
                />
              </div>
            </q-card-section>
            <q-separator class="vipr-copy-separator" />
            <q-card-section class="vipr-copy-section">
              <div class="vipr-copy-row">
                <input
                  class="vipr-copy-value"
                  :title="qrData"
                  :value="qrData"
                  readonly
                  data-testid="receive-invoice-input"
                  aria-label="Lightning invoice"
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
import { useWalletStore } from 'src/stores/wallet'
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
const walletStore = useWalletStore()
const notify = useAppNotify()

// Use the lightning payment composable
const { createInvoice } = useLightningPayment()

// Use the numeric input composable
const { value: amount, keypadButtons } = useNumericInput(0)
const formattedAmount = computed(() => amount.value.toLocaleString())
const invoiceMemo = ref('')
const selectedFederation = computed(() => federationStore.selectedFederation)
const canCreateInvoice = computed(() => {
  return amount.value > 0 && !isCreatingInvoice.value && selectedFederation.value != null
})

let countdownInterval: ReturnType<typeof setInterval> | null = null
let unsubscribeReceiveWait: (() => void) | null = null
let activeReceiveOperationId: string | null = null

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
  cleanupInvoiceWait()
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
  if (selectedFederation.value == null) {
    logger.error('No federation selected')
    notify.error('Select a federation before creating an invoice')
    return
  }

  if (amount.value < 1) {
    return
  }
  isCreatingInvoice.value = true

  try {
    cleanupInvoiceWait()
    const invoiceResult = await createInvoice(amount.value, invoiceMemo.value.trim(), lnExpiry)

    if (
      invoiceResult.success &&
      invoiceResult.invoice != null &&
      invoiceResult.invoice !== '' &&
      invoiceResult.operationId != null &&
      invoiceResult.operationId !== ''
    ) {
      const invoiceAmount = amount.value
      qrData.value = invoiceResult.invoice
      isWaiting.value = true
      activeReceiveOperationId = invoiceResult.operationId
      startCountdownTimer()
      subscribeToInvoicePayment(invoiceResult.operationId, invoiceAmount)
    }
  } finally {
    isCreatingInvoice.value = false
  }
}

function subscribeToInvoicePayment(operationId: string, invoiceAmount: number) {
  unsubscribeReceiveWait =
    walletStore.wallet?.lightning.subscribeLnReceive(
      operationId,
      (state) => {
        if (state !== 'claimed' || activeReceiveOperationId !== operationId) {
          return
        }

        handleInvoicePaid(operationId, invoiceAmount).catch((error: unknown) => {
          logger.error('Failed to handle received Lightning payment', error)
        })
      },
      (error) => {
        if (activeReceiveOperationId !== operationId) {
          return
        }

        cleanupInvoiceWait()
        notify.error(`Error receiving payment: ${getErrorMessage(error)}`)
      },
    ) ?? null
}

async function handleInvoicePaid(operationId: string, invoiceAmount: number) {
  if (activeReceiveOperationId !== operationId) {
    return
  }

  logger.logTransaction('Lightning payment received successfully')
  cleanupInvoiceWait()
  await walletStore.updateBalance()

  if (qrData.value === '') {
    return
  }

  await router.push({
    name: '/received-lightning',
    query: { amount: invoiceAmount.toString() },
  })
}

function cleanupInvoiceWait() {
  unsubscribeReceiveWait?.()
  unsubscribeReceiveWait = null
  activeReceiveOperationId = null
  isWaiting.value = false
  clearCountdownTimer()
}

async function copyToClipboard() {
  await navigator.clipboard.writeText(qrData.value)
}

async function goBack() {
  if (qrData.value !== '') {
    cleanupInvoiceWait()
    qrData.value = ''
    return
  }

  await new Promise((resolve) => {
    setTimeout(resolve, 500)
  }) // delay to allow the animation to play
  await router.push({ name: '/' })
}
</script>

<style scoped>
.receive-content {
  box-sizing: border-box;
  width: 100%;
  padding: var(--vipr-space-0) var(--vipr-space-4) var(--vipr-space-6);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.entry-title {
  margin-bottom: var(--vipr-space-4);
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

.receive-memo-input {
  width: 100%;
}

.receive-status {
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--vipr-space-2);
  margin-top: var(--vipr-space-4-5);
  color: var(--vipr-text-primary);
  text-align: center;
}

.status-time {
  margin-top: 2px;
}

.status-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--vipr-space-2);
  min-width: 0;
  text-align: center;
}

.receive-actions {
  width: 100%;
  max-width: 420px;
  display: flex;
  justify-content: center;
  margin-top: var(--vipr-space-5);
}

@media (max-width: 520px) {
  .receive-content {
    padding-right: var(--vipr-space-4);
    padding-left: var(--vipr-space-4);
  }

  .receive-actions {
    max-width: 100%;
  }

  .receive-actions :deep(.q-btn) {
    width: 100%;
  }
}
</style>
