<template>
  <div class="payment-verification">
    <div
      class="payment-details-card vipr-surface-card vipr-surface-card--strong"
      data-testid="verify-payment-details"
    >
      <div class="payment-details-row vipr-detail-row">
        <div class="vipr-detail-label">Amount</div>
        <div class="vipr-detail-value payment-details-value">{{ decodedInvoice.amount }} sats</div>
      </div>

      <div class="payment-details-row vipr-detail-row">
        <div class="vipr-detail-label">Description</div>
        <div class="vipr-detail-value payment-details-value">{{ decodedInvoice.description }}</div>
      </div>

      <div class="payment-details-row vipr-detail-row">
        <div class="vipr-detail-label">Payment hash</div>
        <div class="vipr-detail-value vipr-detail-value--mono payment-details-value text-wrap">
          {{ decodedInvoice.paymentHash }}
        </div>
      </div>

      <div class="payment-details-row vipr-detail-row">
        <div class="vipr-detail-label">Expires</div>
        <div class="vipr-detail-value payment-details-value">{{ formatExpiry }}</div>
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
        :disable="paymentDisabled"
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Bolt11Invoice } from 'src/types/lightning'

const props = defineProps<{
  decodedInvoice: Bolt11Invoice
  balanceErrorMessage?: string | null
}>()

const emit = defineEmits<{
  cancel: []
  pay: []
}>()

const formatExpiry = computed(() => {
  if (props.decodedInvoice.expiry == null || props.decodedInvoice.expiry === 0) return 'Unknown'
  const date = new Date((props.decodedInvoice.timestamp + props.decodedInvoice.expiry) * 1000)
  return date.toLocaleString()
})
const paymentDisabled = computed(
  () => props.balanceErrorMessage != null && props.balanceErrorMessage !== '',
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
  padding: var(--vipr-space-1) var(--vipr-space-4-5);
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

.payment-details-row {
  display: grid;
  grid-template-columns: minmax(92px, 120px) minmax(0, 1fr);
  gap: var(--vipr-space-3);
  align-items: start;
}

.payment-details-row:first-child {
  padding-top: 0;
}

.payment-details-row:last-child {
  padding-bottom: 0;
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
  height: 56px;
  background: var(--vipr-action-slider-bg);
  border: 1px solid var(--vipr-action-slider-border);
  border-radius: var(--vipr-radius-pill);
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
