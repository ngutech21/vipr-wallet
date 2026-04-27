<route lang="yaml">
meta:
  hideBottomNav: true
</route>

<template>
  <q-page class="scan-page full-height dark-gradient" data-testid="scan-page">
    <q-dialog v-model="showAddFederation" position="bottom" @hide="onAddFederationHide">
      <AddFederation @close="onAddFederationClose" :initial-invite-code="detectedContent" />
    </q-dialog>

    <q-dialog
      v-model="showBip21PaymentChoice"
      position="bottom"
      transition-show="slide-up"
      transition-hide="slide-down"
      @hide="onBip21ChoiceHide"
    >
      <ModalCard title="Choose payment method" @close="showBip21PaymentChoice = false">
        <div class="vipr-selection-sheet">
          <div class="vipr-selection-sheet__intro">
            This Bitcoin QR code supports both Lightning and on-chain payment.
          </div>

          <div
            v-if="bip21PaymentDetails.length > 0"
            class="scan-bip21-summary"
            data-testid="scan-bip21-summary"
          >
            <div
              v-for="detail in bip21PaymentDetails"
              :key="detail.label"
              class="scan-bip21-summary__row"
            >
              <div class="scan-bip21-summary__label">{{ detail.label }}</div>
              <div class="scan-bip21-summary__value">{{ detail.value }}</div>
            </div>
          </div>

          <div class="vipr-selection-sheet__options">
            <BottomSheetOptionCard
              title="Pay with Lightning"
              description="Use the Lightning invoice from this QR code."
              icon="flash_on"
              icon-color="warning"
              data-testid="scan-bip21-lightning-card"
              @select="payBip21WithLightning"
            />

            <BottomSheetOptionCard
              title="Pay on-chain"
              description="Use the Bitcoin address and amount from this QR code."
              icon="currency_bitcoin"
              icon-color="orange"
              data-testid="scan-bip21-onchain-card"
              @select="payBip21Onchain"
            />
          </div>
        </div>
      </ModalCard>
    </q-dialog>

    <div class="camera-container">
      <qrcode-stream
        @detect="onDetect"
        @camera-on="onCameraOn"
        @error="onError"
        :track="paintOutline"
        :paused="scannerPaused"
        :torch="torchActive"
        :formats="['qr_code']"
      />

      <div class="scan-overlay">
        <div class="targeting-frame"></div>
      </div>
    </div>

    <div class="scan-topbar">
      <q-btn
        round
        flat
        color="white"
        icon="arrow_back"
        :to="{ name: '/' }"
        class="scan-topbar__back vipr-topbar__back"
        data-testid="scan-back-btn"
      />
    </div>

    <div class="scan-utility-card vipr-surface-card">
      <div class="scan-status">
        <div class="scan-status__eyebrow vipr-eyebrow">Scanner</div>
        <div class="scan-status__text vipr-caption" data-testid="scan-detected-text">
          {{ detectedContent || 'No QR code detected yet' }}
        </div>
      </div>

      <q-toggle
        v-model="torchActive"
        color="primary"
        icon="flashlight_on"
        checked-icon="flashlight_off"
        :disable="!hasTorch"
        class="scan-utility-card__toggle"
        data-testid="scan-torch-toggle"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
defineOptions({
  name: 'ScanPage',
})

import { QrcodeStream, type DetectedBarcode, type EmittedError } from 'vue-qrcode-reader'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AddFederation from 'src/components/AddFederation.vue'
import BottomSheetOptionCard from 'src/components/BottomSheetOptionCard.vue'
import ModalCard from 'src/components/ModalCard.vue'
import { useAppNotify } from 'src/composables/useAppNotify'
import { logger } from 'src/services/logger'
import { classifyScannedPayment, type ScannedPaymentAction } from 'src/utils/scannedPayment'
import { useFormatters } from 'src/utils/formatter'

const detectedContent = ref<string | null>('')
const router = useRouter()
const torchActive = ref(false)
const hasTorch = ref(false)
const showAddFederation = ref(false)
const showBip21PaymentChoice = ref(false)
const scannerPaused = ref(false)
const pendingBip21Payment = ref<Extract<
  ScannedPaymentAction,
  { type: 'choose-bip21-payment' }
> | null>(null)
const notify = useAppNotify()
const { formatNumber } = useFormatters()

const bip21PaymentDetails = computed(() => {
  const details: Array<{ label: string; value: string }> = []
  const payment = pendingBip21Payment.value

  if (payment == null) {
    return details
  }

  if (payment.onchain.amountSats != null) {
    details.push({
      label: 'Amount',
      value: `${formatNumber(payment.onchain.amountSats)} sats`,
    })
  }

  if (payment.onchain.label != null) {
    details.push({
      label: 'Label',
      value: payment.onchain.label,
    })
  }

  if (payment.onchain.message != null) {
    details.push({
      label: 'Message',
      value: payment.onchain.message,
    })
  }

  return details
})

function onCameraOn(capabilities: unknown) {
  logger.scanner.debug('Camera capabilities detected', { capabilities })
  hasTorch.value = (capabilities as { torch?: boolean }).torch ?? false
}

async function onAddFederationClose() {
  showAddFederation.value = false
  await router.push({ name: '/' })
}

function onAddFederationHide() {
  scannerPaused.value = false
}

async function onDetect(detectedCodes: DetectedBarcode[]) {
  // Process only the first detected code
  const code = detectedCodes[0]
  if (code == null) return

  logger.scanner.debug('Code detected', { rawValue: code.rawValue })
  detectedContent.value = code.rawValue

  const action = classifyScannedPayment(code.rawValue)

  if (action.type === 'add-federation') {
    scannerPaused.value = true
    showAddFederation.value = true
  } else if (action.type === 'send-onchain') {
    await router
      .push({
        path: '/send-onchain',
        query: { target: action.target },
      })
      .catch((error) => logger.error('Failed to navigate to onchain send page', error))
  } else if (action.type === 'send-lightning') {
    await router
      .push({
        name: '/send',
        query: { invoice: action.invoice },
      })
      .catch((error) => logger.error('Failed to navigate to send page', error))
  } else if (action.type === 'choose-bip21-payment') {
    scannerPaused.value = true
    pendingBip21Payment.value = action
    showBip21PaymentChoice.value = true
  } else {
    await router
      .push({
        name: '/receive-ecash',
        query: { token: action.token },
      })
      .catch((error) => logger.error('Failed to navigate to receive ecash page', error))
  }
}

async function payBip21WithLightning() {
  const payment = pendingBip21Payment.value
  if (payment == null) {
    return
  }

  showBip21PaymentChoice.value = false
  await router
    .push({
      name: '/send',
      query: { invoice: payment.lightningInvoice },
    })
    .catch((error) => logger.error('Failed to navigate to send page', error))
}

async function payBip21Onchain() {
  const payment = pendingBip21Payment.value
  if (payment == null) {
    return
  }

  showBip21PaymentChoice.value = false
  await router
    .push({
      path: '/send-onchain',
      query: { target: payment.bitcoinUri },
    })
    .catch((error) => logger.error('Failed to navigate to onchain send page', error))
}

function onBip21ChoiceHide() {
  if (pendingBip21Payment.value == null) {
    return
  }

  pendingBip21Payment.value = null
  scannerPaused.value = false
}

function onError(error: EmittedError) {
  logger.error('Camera error occurred', error)
  notify.error(error.message)
}

function paintOutline(detectedCodes: DetectedBarcode[], ctx: CanvasRenderingContext2D) {
  logger.scanner.debug('Painting QR code outline', {
    codesCount: detectedCodes.length,
    canvas: { width: ctx.canvas.width, height: ctx.canvas.height },
  })
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  for (const detectedCode of detectedCodes) {
    const [firstPoint, ...otherPoints] = detectedCode.cornerPoints

    ctx.lineWidth = 4
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--q-primary')
    const strokeColor = primaryColor.trim()
    if (strokeColor !== '') {
      ctx.strokeStyle = strokeColor
    }

    ctx.beginPath()
    ctx.moveTo(firstPoint.x, firstPoint.y)
    for (const { x, y } of otherPoints) {
      ctx.lineTo(x, y)
    }
    ctx.lineTo(firstPoint.x, firstPoint.y)
    ctx.closePath()
    ctx.stroke()
  }
}
</script>

<style scoped>
.scan-page {
  background-color: var(--vipr-scan-page-bg);
}

.camera-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.scan-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vipr-scan-overlay-bg);
}

.targeting-frame {
  width: 70vw;
  height: 70vw;
  max-width: 300px;
  max-height: 300px;
  border: 2px solid var(--vipr-scan-frame-border);
  border-radius: var(--vipr-radius-lg);
  box-shadow: var(--vipr-scan-frame-shadow);
}

.scan-topbar {
  position: absolute;
  top: calc(var(--vipr-space-3) + env(safe-area-inset-top));
  left: var(--vipr-space-4);
  z-index: 10;
}

.scan-topbar__back {
  width: 52px;
  height: 52px;
  border-radius: var(--vipr-radius-pill);
  background: var(--vipr-glass-panel-bg);
  border-color: var(--vipr-glass-panel-border);
  backdrop-filter: var(--vipr-glass-panel-backdrop);
}

.scan-utility-card {
  position: absolute;
  left: 50%;
  bottom: calc(var(--vipr-space-4-5) + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  width: min(calc(100vw - var(--vipr-space-8)), 520px);
  z-index: 10;
  padding: var(--vipr-radius-control) var(--vipr-radius-button-lg);
  border-radius: var(--vipr-radius-card);
  background: var(--vipr-glass-panel-bg);
  border-color: var(--vipr-glass-panel-border);
  backdrop-filter: var(--vipr-glass-panel-backdrop);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--vipr-space-4);
}

.scan-status {
  min-width: 0;
}

.scan-status__eyebrow {
  line-height: 1.1;
}

.scan-status__text {
  margin-top: var(--vipr-space-1);
  line-height: 1.35;
  font-weight: 500;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scan-utility-card__toggle {
  flex: 0 0 auto;
}

.scan-bip21-summary {
  display: grid;
  gap: var(--vipr-space-2);
  margin-bottom: var(--vipr-space-4);
  padding: var(--vipr-space-4);
  border: 1px solid var(--vipr-color-surface-border);
  border-radius: var(--vipr-radius-button-lg);
  background: var(--vipr-surface-card-bg-subtle);
}

.scan-bip21-summary__row {
  display: grid;
  grid-template-columns: minmax(72px, auto) minmax(0, 1fr);
  gap: var(--vipr-space-3);
  align-items: start;
}

.scan-bip21-summary__label {
  color: var(--vipr-text-soft);
  font-size: var(--vipr-font-size-label);
  line-height: var(--vipr-line-height-tight);
}

.scan-bip21-summary__value {
  min-width: 0;
  color: var(--vipr-text-primary);
  font-size: var(--vipr-font-size-body);
  line-height: var(--vipr-line-height-body);
  overflow-wrap: anywhere;
}

::v-deep(.qrcode-stream) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (max-width: 599px) {
  .scan-utility-card {
    padding: var(--vipr-space-3) var(--vipr-radius-control);
    gap: var(--vipr-space-3);
  }

  .scan-status__text {
    font-size: 0.86rem;
  }
}
</style>
