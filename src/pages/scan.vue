<route lang="yaml">
meta:
  hideBottomNav: true
</route>

<template>
  <q-page class="scan-page full-height dark-gradient" data-testid="scan-page">
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

    <div class="scan-topbar">
      <q-btn
        round
        flat
        color="white"
        icon="arrow_back"
        :to="{ name: '/' }"
        class="scan-topbar__back"
        data-testid="scan-back-btn"
      />
    </div>

    <div class="scan-utility-card">
      <div class="scan-status">
        <div class="scan-status__eyebrow">Scanner</div>
        <div class="scan-status__text" data-testid="scan-detected-text">
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
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AddFederation from 'src/components/AddFederation.vue'
import { useAppNotify } from 'src/composables/useAppNotify'
import { logger } from 'src/services/logger'
import { isBitcoinAddress } from 'src/utils/bitcoinUri'

const detectedContent = ref<string | null>('')
const router = useRouter()
const torchActive = ref(false)
const hasTorch = ref(false)
const showAddFederation = ref(false)
const notify = useAppNotify()

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

  const rawValue = code.rawValue.trim()
  const cleanCode = rawValue.toLocaleLowerCase()

  if (cleanCode.startsWith('fed')) {
    showAddFederation.value = true
  } else if (cleanCode.startsWith('bitcoin:') || isBitcoinAddress(rawValue)) {
    await router
      .push({
        path: '/send-onchain',
        query: { target: rawValue },
      })
      .catch((error) => logger.error('Failed to navigate to onchain send page', error))
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
  } else {
    await router
      .push({
        name: '/receive-ecash',
        query: { token: rawValue },
      })
      .catch((error) => logger.error('Failed to navigate to receive ecash page', error))
  }
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
  background:
    linear-gradient(
      180deg,
      rgba(8, 8, 8, 0.64),
      rgba(8, 8, 8, 0.2) 22%,
      rgba(8, 8, 8, 0.2) 78%,
      rgba(8, 8, 8, 0.72)
    ),
    rgba(0, 0, 0, 0.22);
}

.targeting-frame {
  width: 70vw;
  height: 70vw;
  max-width: 300px;
  max-height: 300px;
  border: 2px solid rgba(162, 43, 255, 0.92);
  border-radius: 28px;
  box-shadow:
    0 0 0 5000px rgba(0, 0, 0, 0.44),
    0 0 0 1px rgba(255, 255, 255, 0.08) inset,
    0 0 32px rgba(111, 0, 255, 0.22);
}

.scan-topbar {
  position: absolute;
  top: calc(12px + env(safe-area-inset-top));
  left: 16px;
  z-index: 10;
}

.scan-topbar__back {
  width: 52px;
  height: 52px;
  border-radius: 999px;
  background: rgba(24, 24, 24, 0.76);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
}

.scan-utility-card {
  position: absolute;
  left: 50%;
  bottom: calc(18px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  width: min(calc(100vw - 32px), 520px);
  z-index: 10;
  padding: 14px 18px;
  border-radius: 22px;
  background: rgba(24, 24, 24, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.scan-status {
  min-width: 0;
}

.scan-status__eyebrow {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.72rem;
  line-height: 1.1;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.scan-status__text {
  margin-top: 4px;
  color: white;
  font-size: 0.92rem;
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

::v-deep(.qrcode-stream) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (max-width: 599px) {
  .scan-utility-card {
    padding: 12px 14px;
    gap: 12px;
  }

  .scan-status__text {
    font-size: 0.86rem;
  }
}
</style>
