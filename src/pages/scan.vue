<route lang="yaml">
meta:
  hideBottomNav: true
</route>

<template>
  <q-page class="full-height">
    <q-dialog v-model="showAddFederation" position="bottom">
      <AddFederation @close="onAddFederationClose" :initial-invite-code="detectedContent" />
    </q-dialog>

    <div class="camera-container">
      <qrcode-stream
        @detect="onDetect"
        @camera-on="onCameraOn"
        @error="onError"
        :track="paintOutline"
        :torch="torchActive"
        :formats="['qr_code']"
      />

      <div class="scan-overlay">
        <div class="targeting-frame"></div>
      </div>
    </div>

    <div class="action-bar top-bar q-px-md q-py-sm">
      <q-btn
        round
        flat
        color="white"
        icon="arrow_back"
        :to="{ name: '/' }"
        class="q-mr-md"
        data-testid="scan-back-btn"
      />
      <div class="text-white text-subtitle1 text-weight-medium">Scan QR Code</div>
    </div>

    <div class="action-bar bottom-bar q-px-md q-py-sm">
      <div class="detected-text text-white text-caption text-weight-medium">
        {{ detectedContent || 'No QR code detected' }}
      </div>
      <q-toggle
        v-model="torchActive"
        color="orange"
        icon="flashlight_on"
        checked-icon="flashlight_off"
        :disable="!hasTorch"
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
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AddFederation from 'src/components/AddFederation.vue'
import { Notify } from 'quasar'
import { logger } from 'src/services/logger'

const detectedContent = ref<string | null>('')
const router = useRouter()
const torchActive = ref(false)
const hasTorch = ref(false)
const showAddFederation = ref(false)

function onCameraOn(capabilities: unknown) {
  logger.scanner.debug('Camera capabilities detected', { capabilities })
  hasTorch.value = (capabilities as { torch?: boolean }).torch ?? false
}

function stripLightningPrefix(value: string): string {
  return value.startsWith('lightning:') ? value.substring('lightning:'.length) : value
}

async function onAddFederationClose() {
  showAddFederation.value = false
  await router.push({ name: '/' })
}

async function onDetect(detectedCodes: DetectedBarcode[]) {
  // Process only the first detected code
  const code = detectedCodes[0]
  if (code == null) return

  logger.scanner.debug('Code detected', { rawValue: code.rawValue })
  detectedContent.value = code.rawValue

  const cleanCode = code.rawValue.toLocaleLowerCase()

  if (cleanCode.startsWith('fed')) {
    showAddFederation.value = true
  } else if (
    cleanCode.startsWith('ln') ||
    cleanCode.includes('@') ||
    cleanCode.startsWith('lightning:')
  ) {
    const invoice = stripLightningPrefix(cleanCode)
    await router
      .push({
        name: '/send',
        query: { invoice },
      })
      .catch((error) => logger.error('Failed to navigate to send page', error))
  }
}

function onError(error: EmittedError) {
  logger.error('Camera error occurred', error)
  Notify.create({
    message: error.message,
    color: 'negative',
    position: 'top',
  })
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
    ctx.strokeStyle = 'red'

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
  background-color: #000;
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
  background: rgba(0, 0, 0, 0.3);
}

.targeting-frame {
  width: 70vw;
  height: 70vw;
  max-width: 300px;
  max-height: 300px;
  border: 2px solid var(--q-primary);
  border-radius: 20px;
  box-shadow: 0 0 0 5000px rgba(0, 0, 0, 0.5);
}

.action-bar {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 10;
  background: rgba(32, 32, 32, 0.7);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
}

.top-bar {
  top: 0;
  border-bottom-left-radius: 16px;
  border-bottom-right-radius: 16px;
  padding-top: env(safe-area-inset-top);
}

.bottom-bar {
  bottom: 0;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  padding-bottom: env(safe-area-inset-bottom);
}

.camera-selector {
  min-width: 120px;
}

.detected-text {
  color: white;
  font-size: 12px;
  max-width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

::v-deep(.qrcode-stream) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
