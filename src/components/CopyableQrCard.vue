<template>
  <div class="vipr-qr-card-shell">
    <div v-if="eyebrow" class="vipr-qr-eyebrow">{{ eyebrow }}</div>
    <q-card
      flat
      :class="[
        'vipr-qr-card task-card vipr-surface-card--strong',
        compact ? 'vipr-qr-card--compact' : '',
        !showValue ? 'vipr-qr-card--actions-only' : '',
        cardClass,
      ]"
      :data-testid="containerTestId"
    >
      <q-card-section class="vipr-qr-container">
        <button
          v-if="enableQrZoom"
          type="button"
          class="vipr-qr-trigger"
          :aria-label="zoomAriaLabel"
          :data-testid="qrZoomButtonTestId"
          @click="showZoomedQr = true"
        >
          <div class="vipr-qr-surface">
            <qrcode-vue :value="value" level="M" render-as="svg" :size="0" class="vipr-qr-code" />
          </div>
        </button>
        <div v-else class="vipr-qr-static">
          <div class="vipr-qr-surface">
            <qrcode-vue :value="value" level="M" render-as="svg" :size="0" class="vipr-qr-code" />
          </div>
        </div>
      </q-card-section>
      <q-separator v-if="!compact" class="vipr-copy-separator" />
      <q-card-section class="vipr-copy-section">
        <div v-if="heading || description" class="vipr-copy-heading">
          <div v-if="heading" class="vipr-copy-title">{{ heading }}</div>
          <div v-if="description" class="vipr-copy-description">{{ description }}</div>
        </div>
        <div v-if="label" class="vipr-copy-label">{{ label }}</div>
        <div class="vipr-copy-row">
          <input
            v-if="showValue"
            class="vipr-copy-value"
            :title="value"
            :value="value"
            readonly
            :data-testid="inputTestId"
            :aria-label="inputAriaLabel"
          />
          <q-btn icon="content_copy" flat round @click="emit('copy')" :data-testid="copyTestId" />
          <q-btn
            v-if="showShare"
            icon="share"
            flat
            round
            @click="emit('share')"
            :data-testid="shareTestId"
          />
        </div>
      </q-card-section>
    </q-card>

    <q-dialog v-if="enableQrZoom" v-model="showZoomedQr">
      <q-card class="vipr-qr-dialog-card vipr-surface-card vipr-surface-card--strong">
        <q-card-section class="vipr-qr-dialog-header">
          <div class="vipr-qr-dialog-title">{{ zoomTitle }}</div>
          <q-btn
            icon="close"
            flat
            round
            aria-label="Close QR code"
            :data-testid="qrZoomCloseTestId"
            @click="showZoomedQr = false"
          />
        </q-card-section>
        <q-card-section class="vipr-qr-dialog-body">
          <div class="vipr-qr-dialog-surface">
            <qrcode-vue :value="value" level="M" render-as="svg" :size="0" class="vipr-qr-code" />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'CopyableQrCard',
})

import { computed, ref } from 'vue'
import QrcodeVue from 'qrcode.vue'

const props = withDefaults(
  defineProps<{
    value: string
    inputAriaLabel: string
    testIdPrefix: string
    eyebrow?: string
    heading?: string
    description?: string
    label?: string
    cardClass?: string
    showShare?: boolean
    showValue?: boolean
    enableQrZoom?: boolean
    compact?: boolean
    containerTestId?: string
    inputTestId?: string
    copyTestId?: string
    shareTestId?: string
  }>(),
  {
    eyebrow: '',
    heading: '',
    description: '',
    label: '',
    cardClass: '',
    showShare: true,
    showValue: true,
    enableQrZoom: false,
    compact: false,
    containerTestId: '',
    inputTestId: '',
    copyTestId: '',
    shareTestId: '',
  },
)

const emit = defineEmits<{
  copy: []
  share: []
}>()

const showZoomedQr = ref(false)

const containerTestId = computed(() =>
  props.containerTestId !== '' ? props.containerTestId : `${props.testIdPrefix}-container`,
)
const inputTestId = computed(() =>
  props.inputTestId !== '' ? props.inputTestId : `${props.testIdPrefix}-input`,
)
const copyTestId = computed(() =>
  props.copyTestId !== '' ? props.copyTestId : `${props.testIdPrefix}-copy-btn`,
)
const shareTestId = computed(() =>
  props.shareTestId !== '' ? props.shareTestId : `${props.testIdPrefix}-share-btn`,
)
const qrZoomButtonTestId = computed(() => `${props.testIdPrefix}-qr-zoom-btn`)
const qrZoomCloseTestId = computed(() => `${props.testIdPrefix}-qr-zoom-close-btn`)
const zoomTitle = computed(() => {
  if (props.heading !== '') {
    return props.heading
  }

  return props.label !== '' ? props.label : 'QR code'
})
const zoomAriaLabel = computed(() => `Open larger ${zoomTitle.value}`)
</script>
