<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page class="padding">
        <q-btn icon="arrow_back" label="Back" flat class="q-mb-lg" :to="'/'" />
        <div class="row items-center justify-evenly">
          <q-card class="q-px-md q-pt-md q-pb-xl full-width">
            <q-card-section>
              <div class="text-h6">Scan QR Code</div>
            </q-card-section>

            <q-separator />

            <q-card-section>
              <qrcode-stream @detect="onDetect" @init="onInit" />
            </q-card-section>

            <q-card-section>
              <q-input
                filled
                label="Detected QR Code"
                v-model="detectedContent"
                readonly
                type="textarea"
              />
            </q-card-section>

            <q-card-section>
              <q-btn label="Close" color="primary" :to="'/'" />
            </q-card-section>
          </q-card>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { QrcodeStream } from 'vue-qrcode-reader'
import type { DetectedBarcode } from 'vue-qrcode-reader'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const detectedContent = ref('')
const isLoading = ref(true)
const router = useRouter()

function onDetect(detectedCodes: DetectedBarcode[]) {
  // Process only the first detected code
  const code = detectedCodes[0]
  if (!code) return

  console.log('Detected code:', code.rawValue)
  detectedContent.value = code.rawValue

  if (code.rawValue.startsWith('fed')) {
    alert('Detected Fedimint Invitecode: ' + code.rawValue)
  } else if (code.rawValue.startsWith('lnbc')) {
    alert('Lightning Invoice detected: ' + code.rawValue)
    router
      .push({
        name: 'send',
        params: { invoice: code.rawValue },
      })
      .catch(console.error)
  }
}
function onInit(promise: Promise<void>) {
  promise
    .then(() => {
      isLoading.value = false
    })
    .catch((error) => {
      if (error.name === 'NotAllowedError') {
        alert('Please allow camera access to scan QR codes.')
      } else if (error.name === 'NotFoundError') {
        alert('No camera found on this device.')
      } else {
        alert('Error initializing QR code scanner: ' + error.message)
      }
    })
    .finally(() => {
      isLoading.value = false
    })
}
</script>

<style scoped>
.full-width {
  width: 100%;
}
</style>
