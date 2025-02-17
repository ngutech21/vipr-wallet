<template>
  <q-page class="column q-px-md">
    <div class="text-h6 q-pt-md q-mb-md">Settings</div>
    <q-card class="full-width">
      <q-card-section>
        <div class="text-subtitle1">App Version: {{ version }}</div>
        <div class="text-subtitle1">Quasar Version: {{ quasarVersion }}</div>
        <BuildInfo />
        <q-btn
          label="Check for Updates"
          icon="refresh"
          color="primary"
          class="q-mt-md"
          @click="checkForUpdates"
        />
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { version } from '../../package.json'
import { version as quasarVersion } from 'quasar/package.json'
import BuildInfo from 'src/components/BuildInfo.vue'
import { Dialog } from 'quasar'

async function checkForUpdates() {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration?.waiting) {
      Dialog.create({
        title: 'Update Available',
        message: 'A new version is available. Update now?',
        persistent: true,
        ok: { label: 'Update', color: 'primary' },
        cancel: true,
      }).onOk(() => {
        registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
        window.location.reload()
      })
    } else {
      await registration?.update()
    }
  }
}
</script>

<style scoped>
.full-width {
  width: 100%;
}
</style>
