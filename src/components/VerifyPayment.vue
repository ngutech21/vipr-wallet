<template>
  <div class="payment-verification">

    <q-card flat class="glass-effect q-mb-lg">
      <q-card-section>
        <div class="row q-mb-sm">
          <div class="col-4 text-weight-medium text-white-8">Amount</div>
          <div class="col text-white text-weight-bold">{{ decodedInvoice.amount }} sats</div>
        </div>

        <div class="row q-mb-sm">
          <div class="col-4 text-weight-medium text-white-8">Description</div>
          <div class="col text-white text-weight-bold">{{ decodedInvoice.description }}</div>
        </div>

        <div class="row q-mb-sm">
          <div class="col-4 text-weight-medium text-white-8">Payment Hash</div>
          <div class="col text-white text-weight-bold text-wrap">{{ decodedInvoice.paymentHash }}</div>
        </div>

        <div class="row q-mb-sm">
          <div class="col-4 text-weight-medium text-white-8">Expires</div>
          <div class="col text-white text-weight-bold">{{ formatExpiry }}</div>
        </div>
      </q-card-section>
    </q-card>

    <div class="q-mt-md payment-slider-container">
      <q-slide-item
        @left="$emit('pay')"
        @action="onSlideAction"
        left-color="transparent"
        class="no-border payment-slider"
      >
        <template v-slot:left>
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
import { computed} from 'vue'
import type { Bolt11Invoice } from 'src/components/models'

const props = defineProps<{
  decodedInvoice: Bolt11Invoice
}>()


defineEmits<{
  cancel: []
  pay: []
}>()

const formatExpiry = computed(() => {
  if (!props.decodedInvoice.expiry) return 'Unknown'
  const date = new Date((props.decodedInvoice.timestamp + props.decodedInvoice.expiry) * 1000)
  return date.toLocaleString()
})

function onSlideAction({ side, reset }: { side: 'left' | 'right' | 'top' | 'bottom'; reset: () => void }) {
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

.text-white-8 {
  color: rgba(255, 255, 255, 0.8);
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
</style>
