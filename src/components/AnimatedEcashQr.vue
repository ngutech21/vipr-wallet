<template>
  <div v-if="frames.length > 0" class="animated-ecash-qr" data-testid="animated-ecash-qr">
    <qrcode-vue
      :value="currentFrame"
      level="M"
      render-as="svg"
      :size="0"
      class="responsive-qr"
      data-testid="animated-ecash-qr-code"
    />
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'AnimatedEcashQr',
})

import { computed, onBeforeUnmount, ref, watch } from 'vue'
import QrcodeVue from 'qrcode.vue'
import { buildEcashQrFrames, ECASH_QR_FRAME_INTERVAL_MS } from 'src/utils/ecashQrFrames'

const props = defineProps<{
  notes: string
}>()

const currentFrameIndex = ref(0)
const frames = computed(() => buildEcashQrFrames(props.notes))
const currentFrame = computed(() => frames.value[currentFrameIndex.value] ?? '')

let frameInterval: ReturnType<typeof setInterval> | null = null

function stopFrameRotation() {
  if (frameInterval != null) {
    clearInterval(frameInterval)
    frameInterval = null
  }
}

function startFrameRotation() {
  stopFrameRotation()

  if (frames.value.length <= 1) {
    return
  }

  frameInterval = setInterval(() => {
    currentFrameIndex.value = (currentFrameIndex.value + 1) % frames.value.length
  }, ECASH_QR_FRAME_INTERVAL_MS)
}

watch(
  frames,
  () => {
    currentFrameIndex.value = 0
    startFrameRotation()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  stopFrameRotation()
})
</script>

<style scoped>
.animated-ecash-qr {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--vipr-space-4);
}

.responsive-qr {
  width: min(70vw, 320px);
  height: min(70vw, 320px);
  background: var(--vipr-qr-surface-bg);
  padding: var(--vipr-space-3);
  border-radius: var(--vipr-radius-md);
}
</style>
