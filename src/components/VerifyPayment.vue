<template>
  <div class="payment-verification">
    <div class="payment-details-card q-mb-lg">
      <div class="payment-details-row">
        <div class="payment-details-label">Amount</div>
        <div class="payment-details-value">{{ decodedInvoice.amount }} sats</div>
      </div>

      <div class="payment-details-row">
        <div class="payment-details-label">Description</div>
        <div class="payment-details-value">{{ decodedInvoice.description }}</div>
      </div>

      <div class="payment-details-row">
        <div class="payment-details-label">Payment hash</div>
        <div class="payment-details-value text-wrap">{{ decodedInvoice.paymentHash }}</div>
      </div>

      <div class="payment-details-row payment-details-row--last">
        <div class="payment-details-label">Expires</div>
        <div class="payment-details-value">{{ formatExpiry }}</div>
      </div>
    </div>

    <div class="q-mt-md payment-slider-container">
      <q-slide-item
        @left="$emit('pay')"
        @action="onSlideAction"
        left-color="transparent"
        class="no-border payment-slider"
      >
        <template #left>
          <div class="full-height full-width row justify-end items-center">
            <q-icon name="check" size="32px" color="white" />
          </div>
        </template>

        <div class="payment-slider-content">
          <div class="slider-handle">
            <q-icon name="bolt" color="white" size="20px" />
          </div>
          <div class="slider-text">Slide to Pay</div>
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
}>()

defineEmits<{
  cancel: []
  pay: []
}>()

const formatExpiry = computed(() => {
  if (props.decodedInvoice.expiry == null || props.decodedInvoice.expiry === 0) return 'Unknown'
  const date = new Date((props.decodedInvoice.timestamp + props.decodedInvoice.expiry) * 1000)
  return date.toLocaleString()
})

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
  padding-bottom: 20px;
}

.payment-details-card {
  padding: 16px 18px;
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.025)),
    rgba(18, 18, 18, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.payment-details-row {
  display: grid;
  grid-template-columns: minmax(92px, 120px) minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.payment-details-row:first-child {
  padding-top: 0;
}

.payment-details-row--last {
  padding-bottom: 0;
  border-bottom: 0;
}

.payment-details-label {
  color: rgba(255, 255, 255, 0.62);
  font-weight: 600;
}

.payment-details-value {
  color: white;
  font-weight: 600;
}

/* Payment Slider Styling */
.payment-slider-container {
  position: relative;
  width: 100%;
  border-radius: 30px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.payment-slider {
  height: 56px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 30px;
}

.payment-slider :deep(.q-slide-item__left .q-icon) {
  opacity: 0;
  transition: opacity 0.2s;
}

.payment-slider:active :deep(.q-slide-item__left .q-icon) {
  opacity: 1;
}

.payment-slider :deep(.q-slide-item__left) {
  /* Remove the gradient background */
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
  border-radius: 50%;
  background: linear-gradient(145deg, var(--q-primary), #8000ff);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 2;
}

.slider-text {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  font-size: larger;
  letter-spacing: 0.5px;
  z-index: 1;
}

/* Animation for successful slide */
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
