<template>
  <div>
    <div class="text-h6 q-mb-md">Verify Payment Details</div>

    <q-card flat bordered>
      <q-card-section>
        <div class="row q-mb-sm">
          <div class="col-4 text-weight-medium">Amount</div>
          <div class="col">{{ decodedInvoice.amount / 1_000 }} sats</div>
        </div>

        <div class="row q-mb-sm">
          <div class="col-4 text-weight-medium">Description</div>
          <div class="col">{{ decodedInvoice.description }}</div>
        </div>

        <div class="row q-mb-sm">
          <div class="col-4 text-weight-medium">Payment Hash</div>
          <div class="col text-wrap">{{ decodedInvoice.paymentHash }}</div>
        </div>

        <div class="row q-mb-sm">
          <div class="col-4 text-weight-medium">Expires</div>
          <div class="col">{{ formatExpiry }}</div>
        </div>
      </q-card-section>
    </q-card>

    <SlideUnlock
      ref="slideUnlock"
      :auto-width="true"
      :circle="true"
      text="Slide to Pay"
      success-text="Payment Confirmed!"
      @completed="$emit('pay')"
      class="q-mt-md"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Bolt11Invoice } from 'src/components/models'
import SlideUnlock from '@j2only/slide-unlock'

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

const slideUnlock = ref<InstanceType<typeof SlideUnlock> | null>(null)
</script>

<style scoped>
.text-wrap {
  word-break: break-all;
}
</style>

<style></style>
