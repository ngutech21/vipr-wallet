<template>
  <div class="payment-verification">
    <div
      class="payment-details-card vipr-surface-card vipr-surface-card--strong"
      data-testid="verify-payment-details"
    >
      <div class="payment-amount-summary">
        <div class="payment-amount-summary__label">Amount</div>
        <div class="payment-amount-summary__value">{{ decodedInvoice.amount }} sats</div>
      </div>

      <div v-if="invoiceDescription" class="payment-details-row vipr-detail-row">
        <div class="vipr-detail-label">Description</div>
        <div class="vipr-detail-value payment-details-value">{{ invoiceDescription }}</div>
      </div>

      <div v-if="formattedEstimatedGatewayFee" class="payment-details-row vipr-detail-row">
        <div class="vipr-detail-label">Gateway fee</div>
        <div class="vipr-detail-value payment-details-value">
          {{ formattedEstimatedGatewayFee }}
        </div>
      </div>
    </div>

    <div
      v-if="balanceErrorMessage"
      class="payment-balance-error"
      data-testid="verify-payment-balance-error"
    >
      {{ balanceErrorMessage }}
    </div>

    <div class="payment-slider-container">
      <q-slide-item
        v-if="!paymentDisabled"
        @left="onPayRequested"
        @action="onSlideAction"
        left-color="transparent"
        class="no-border payment-slider"
        data-testid="verify-payment-slider"
      >
        <template #left>
          <div class="payment-slider-confirmation">
            <q-icon name="check" size="32px" color="white" />
          </div>
        </template>

        <div class="payment-slider-content">
          <div class="slider-handle">
            <q-icon name="bolt" color="white" size="20px" />
          </div>
          <div class="slider-text vipr-section-title">Slide to Pay</div>
        </div>
      </q-slide-item>

      <button
        v-else
        type="button"
        class="payment-slider payment-slider--disabled"
        disabled
        aria-disabled="true"
        data-testid="verify-payment-slider-disabled"
      >
        <div class="payment-slider-content">
          <div class="slider-handle slider-handle--disabled">
            <q-icon name="bolt" color="white" size="20px" />
          </div>
          <div class="slider-text vipr-section-title">Insufficient balance</div>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { Bolt11Invoice } from 'src/types/lightning'
import { logger } from 'src/services/logger'
import { useWalletStore } from 'src/stores/wallet'

const props = defineProps<{
  decodedInvoice: Bolt11Invoice
  balanceErrorMessage?: string | null
}>()

const emit = defineEmits<{
  cancel: []
  pay: []
}>()

const walletStore = useWalletStore()
const estimatedGatewayFeeMsats = ref<number | null>(null)

const invoiceDescription = computed(() => props.decodedInvoice.description?.trim() ?? '')
const formattedEstimatedGatewayFee = computed(() => {
  if (estimatedGatewayFeeMsats.value == null) {
    return null
  }

  return `~${formatMsatsAsSats(estimatedGatewayFeeMsats.value)} sats`
})
const paymentDisabled = computed(
  () => props.balanceErrorMessage != null && props.balanceErrorMessage !== '',
)

onMounted(() => {
  refreshEstimatedGatewayFee().catch((error) => {
    logger.warn('Failed to refresh Lightning gateway fee estimate', { error })
  })
})

watch(
  () => props.decodedInvoice.invoice,
  () => {
    refreshEstimatedGatewayFee().catch((error) => {
      logger.warn('Failed to refresh Lightning gateway fee estimate', { error })
    })
  },
)

function onPayRequested() {
  if (paymentDisabled.value) {
    return
  }

  emit('pay')
}

function onSlideAction({
  side,
  reset,
}: {
  side: 'left' | 'right' | 'top' | 'bottom'
  reset: () => void
}) {
  if (side === 'left') {
    // If it's being slid to the left but not completed
    setTimeout(() => {
      reset()
    }, 300)
  }
}

async function refreshEstimatedGatewayFee() {
  estimatedGatewayFeeMsats.value = null

  try {
    const wallet = walletStore.wallet
    if (wallet == null) {
      return
    }

    await wallet.lightning.updateGatewayCache()
    const gateway = (await wallet.lightning.listGateways())[0]?.info
    const feeMsats = estimateGatewayFeeMsats(gateway?.fees, props.decodedInvoice.amount * 1_000)
    estimatedGatewayFeeMsats.value = feeMsats
  } catch (error) {
    logger.warn('Failed to estimate Lightning gateway fee', { error })
  }
}

function estimateGatewayFeeMsats(fees: unknown, amountMsats: number): number | null {
  if (!Number.isFinite(amountMsats) || amountMsats < 0 || fees == null) {
    return null
  }

  const feeRecord = fees as Record<string, unknown>
  const baseMsats = readMsats(feeRecord.base)
  const partsPerMillion = readNumber(feeRecord.parts_per_million ?? feeRecord.partsPerMillion)

  if (baseMsats == null || partsPerMillion == null) {
    return null
  }

  return Math.max(0, Math.ceil(baseMsats + (amountMsats * partsPerMillion) / 1_000_000))
}

function readMsats(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (value == null || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  return readNumber(record.msats ?? record.msat)
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function formatMsatsAsSats(msats: number): string {
  return (msats / 1_000).toLocaleString(undefined, {
    maximumFractionDigits: msats % 1_000 === 0 ? 0 : 3,
  })
}
</script>

<style scoped>
.text-wrap {
  word-break: break-all;
}

.payment-verification {
  padding-bottom: var(--vipr-space-5);
}

.payment-details-card {
  margin-bottom: var(--vipr-space-6);
  padding: var(--vipr-space-4) var(--vipr-space-4-5);
}

.payment-balance-error {
  margin-bottom: var(--vipr-space-4);
  padding: var(--vipr-space-3) var(--vipr-space-4);
  border-radius: var(--vipr-radius-control);
  border: 1px solid var(--q-negative);
  color: var(--q-negative);
  background: var(--vipr-color-surface-soft);
  font-size: var(--vipr-font-size-label);
  line-height: var(--vipr-line-height-body);
  text-align: center;
}

.payment-amount-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--vipr-space-4);
  min-height: var(--vipr-control-height-lg);
}

.payment-amount-summary__label {
  color: var(--vipr-text-soft);
  font-size: var(--vipr-font-size-section-title);
  font-weight: 700;
  line-height: var(--vipr-line-height-tight);
}

.payment-amount-summary__value {
  color: var(--vipr-text-primary);
  font-size: var(--vipr-font-size-summary-title);
  font-weight: 700;
  line-height: var(--vipr-line-height-tight);
  text-align: right;
  white-space: nowrap;
}

.payment-details-row {
  display: grid;
  grid-template-columns: minmax(92px, 120px) minmax(0, 1fr);
  gap: var(--vipr-space-3);
  align-items: start;
  margin-top: var(--vipr-space-3);
  padding-top: var(--vipr-space-3);
  border-top: 1px solid var(--vipr-color-surface-border);
}

.payment-details-value {
  color: var(--vipr-text-primary);
  font-weight: 600;
}

.payment-slider-container {
  position: relative;
  width: 100%;
  margin-top: var(--vipr-space-4);
  border-radius: var(--vipr-radius-pill);
  overflow: hidden;
  box-shadow: var(--vipr-action-slider-shadow);
}

.payment-slider-confirmation {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: flex-end;
}

.payment-slider {
  width: 100%;
  height: 56px;
  background: var(--vipr-action-slider-bg);
  border: 1px solid var(--vipr-action-slider-border);
  border-radius: var(--vipr-radius-pill);
}

.payment-slider--disabled {
  cursor: not-allowed;
  opacity: 0.58;
  box-shadow: none;
}

.payment-slider :deep(.q-slide-item__left .q-icon) {
  opacity: 0;
  transition: opacity 0.2s;
}

.payment-slider:active :deep(.q-slide-item__left .q-icon) {
  opacity: 1;
}

.payment-slider :deep(.q-slide-item__left) {
  background: transparent !important;
}

.payment-slider-content {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 56px;
  padding-left: 56px;
}

.slider-handle {
  position: absolute;
  left: 6px;
  top: 8px;
  width: 40px;
  height: 40px;
  border-radius: var(--vipr-radius-round);
  background: var(--vipr-action-slider-handle-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--vipr-shadow-primary-subtle);
  border: 1px solid var(--vipr-color-surface-border);
  z-index: 2;
}

.slider-handle--disabled {
  background: var(--vipr-color-surface-raised);
  box-shadow: none;
}

.slider-text {
  color: var(--vipr-text-primary);
  z-index: 1;
}

.q-slide-item__content {
  transition: transform 0.3s;
}

@media (max-width: 599px) {
  .payment-details-row {
    grid-template-columns: 1fr;
    gap: 6px;
  }
}
</style>
