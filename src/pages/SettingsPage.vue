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
import { Dialog, Loading, Notify } from 'quasar'

async function checkForUpdates() {
  if (!('serviceWorker' in navigator)) {
    Notify.create({
      message: 'Service Worker not supported',
      color: 'negative',
    })
    return
  }

  try {
    Loading.show({ message: 'Checking for updates...' })
    const registration = await navigator.serviceWorker.getRegistration()

    if (!registration) {
      Notify.create({
        message: 'Service Worker not registered',
        color: 'warning',
      })
      return
    }

    if (registration.waiting) {
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
      await registration.update()
      Notify.create({
        message: 'No updates available',
        color: 'positive',
      })
    }
  } catch (error) {
    console.error('Update check failed:', error)
    Notify.create({
      message: 'Failed to check for updates',
      color: 'negative',
    })
  } finally {
    Loading.hide()
  }
}
</script>

<style scoped>
.full-width {
  width: 100%;
}
</style>
