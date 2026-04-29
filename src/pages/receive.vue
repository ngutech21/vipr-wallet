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
      <ViprTopbar
        topbar-class="receive-topbar"
        button-class="receive-topbar__back"
        button-test-id="receive-back-btn"
        @back="goBack"
      />

      <div class="receive-content vipr-flow-content">
        <FederationSelector
          class="receive-federation-selector"
          :class="{ 'receive-federation-selector--qr': qrData !== '' }"
          :selectable="qrData === ''"
          test-id-prefix="receive-federation"
        />

        <div class="vipr-flow-center">
          <div
            v-if="!qrData"
            class="vipr-flow-panel vipr-flow-panel--padded task-card vipr-surface-card--strong"
          >
            <AmountEntryGroup
              :value="formattedAmount"
              :buttons="keypadButtons"
              amount-test-id="amount-input"
              :reserve-meta-space="false"
              class="vipr-flow-spacer-lg"
            >
              <q-input
                v-model="invoiceMemo"
                filled
                dark
                label="Memo (optional)"
                placeholder="Optional description"
                maxlength="160"
                class="vipr-input receive-memo-input"
                data-testid="receive-memo-input"
              />
            </AmountEntryGroup>
          </div>
        </div>

        <div v-if="!qrData" class="vipr-flow-bottom-action">
          <div class="vipr-flow-bottom-hint">Creates a Lightning invoice for this federation.</div>
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

        <CopyableQrCard
          v-if="qrData"
          :value="qrData"
          input-aria-label="Lightning invoice"
          test-id-prefix="receive"
          container-test-id="receive-qr-container"
          input-test-id="receive-invoice-input"
          copy-test-id="receive-copy-invoice-btn"
          share-test-id="receive-share-invoice-btn"
          @copy="copyToClipboard"
          @share="shareQrcode"
        />

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

        <div v-if="qrData" class="receive-actions">
          <q-btn
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
import { Loading } from 'quasar'
import { useRouter } from 'vue-router'
import { init, requestProvider } from '@getalby/bitcoin-connect'
import { useFederationStore } from 'src/stores/federation'
import { useWalletStore } from 'src/stores/wallet'
import { logger } from 'src/services/logger'
import AmountEntryGroup from 'src/components/AmountEntryGroup.vue'
import CopyableQrCard from 'src/components/CopyableQrCard.vue'
import FederationSelector from 'src/components/FederationSelector.vue'
import ViprTopbar from 'src/components/ViprTopbar.vue'
import { useAppNotify } from 'src/composables/useAppNotify'
import { useCopyShare } from 'src/composables/useCopyShare'
import { useLightningPayment } from 'src/composables/useLightningPayment'
import { useNumericInput } from 'src/composables/useNumericInput'
import { getErrorMessage } from 'src/utils/error'

const qrData = ref('')
const router = useRouter()
const lnExpiry = 60 * 59 // 59 minutes
const countdown = ref(lnExpiry)
const isWaiting = ref(false)
const isCreatingInvoice = ref(false)
const federationStore = useFederationStore()
const walletStore = useWalletStore()
const notify = useAppNotify()

// Use the lightning payment composable
const { createInvoice } = useLightningPayment()

// Use the numeric input composable
const { value: amount, keypadButtons } = useNumericInput(0)
const { copyToClipboard, shareValue: shareInvoice } = useCopyShare({
  value: qrData,
  copySuccessMessage: null,
  shareTitle: computed(() => `Lightning Invoice for ${amount.value} sats`),
  shareUnavailableMessage: 'Invoice copied. Share is not available in this browser.',
})
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
  await shareInvoice()
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
.receive-federation-selector {
  width: 100%;
  max-width: var(--vipr-width-flow-panel);
  margin-bottom: var(--vipr-space-3);
}

.receive-federation-selector--qr {
  max-width: 600px;
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
  margin-top: auto;
  padding-top: var(--vipr-space-5);
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
