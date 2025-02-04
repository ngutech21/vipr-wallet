<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page class="row items-center justify-evenly">
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
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { QrcodeStream } from 'vue-qrcode-reader'
import type { DetectedBarcode } from 'vue-qrcode-reader'
import { ref } from 'vue'

const detectedContent = ref('')

function onDetect(detectedCodes: DetectedBarcode[]) {
  detectedCodes.forEach((code) => {
    console.log('Detected code:', code.rawValue)
    detectedContent.value = code.rawValue

    return
  })
}

function onInit(promise: Promise<void>) {
  promise.catch((error) => {
    if (error.name === 'NotAllowedError') {
      alert('Please allow camera access to scan QR codes.')
    } else if (error.name === 'NotFoundError') {
      alert('No camera found on this device.')
    } else {
      alert('Error initializing QR code scanner: ' + error.message)
    }
  })
}
</script>

<style scoped>
.full-width {
  width: 100%;
}
</style>
