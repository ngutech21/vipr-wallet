<template>
  <div class="vipr-qr-card-shell">
    <q-card
      flat
      :class="['vipr-qr-card task-card vipr-surface-card--strong', cardClass]"
      :data-testid="containerTestId"
    >
      <q-card-section class="vipr-qr-container">
        <div class="vipr-qr-surface">
          <qrcode-vue :value="value" level="M" render-as="svg" :size="0" class="vipr-qr-code" />
        </div>
      </q-card-section>
      <q-separator class="vipr-copy-separator" />
      <q-card-section class="vipr-copy-section">
        <div v-if="label" class="vipr-copy-label">{{ label }}</div>
        <div class="vipr-copy-row">
          <input
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
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'CopyableQrCard',
})

import { computed } from 'vue'
import QrcodeVue from 'qrcode.vue'

const props = withDefaults(
  defineProps<{
    value: string
    inputAriaLabel: string
    testIdPrefix: string
    label?: string
    cardClass?: string
    showShare?: boolean
    containerTestId?: string
    inputTestId?: string
    copyTestId?: string
    shareTestId?: string
  }>(),
  {
    label: '',
    cardClass: '',
    showShare: true,
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
</script>
