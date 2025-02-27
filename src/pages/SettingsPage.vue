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
      <q-card-section>
        <div class="text-h6">Danger Zone</div>

        <q-card-actions>
          <q-btn label="Delete ALL Data" color="primary" @click="deleteData" />
        </q-card-actions>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { version } from '../../package.json'
import { version as quasarVersion } from 'quasar/package.json'
import BuildInfo from 'src/components/BuildInfo.vue'
import { Dialog, Loading, Notify } from 'quasar'

function deleteData() {
  console.log('Deleting data...')
  Dialog.create({
    title: 'Delete Data',
    message: 'Are you sure you want to delete all data?',
    persistent: true,
    ok: { label: 'Delete', color: 'negative' },
    cancel: true,
  }).onOk(() => {
    Loading.show({ message: 'Deleting data...' })
    localStorage.clear()
    indexedDB
      .databases()
      .then((databases) => {
        if (databases.length === 0) {
          return
        }
        const deletePromises = databases
          .filter((db): db is IDBDatabaseInfo & { name: string } => !!db.name)
          .map((db) => indexedDB.deleteDatabase(db.name))
        return Promise.all(deletePromises)
      })
      .catch((error) => {
        console.error('Error deleting data:', error)
        Notify.create({
          type: 'negative',
          message: 'Error deleting data',
          position: 'top',
        })
      })
      .finally(() => {
        Loading.hide()
        Notify.create({
          type: 'positive',
          message: 'Data deleted successfully',
          position: 'top',
        })
      })
  })
}
async function checkForUpdates() {
  if (!('serviceWorker' in navigator)) {
    Notify.create({
      message: 'Service Worker not supported',
      color: 'negative',
      position: 'top',
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
        position: 'top',
      })
      return
    }

    // First, check for updates and wait for it to complete
    await registration.update()

    // Then check if we have a waiting worker
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
      Notify.create({
        message: 'No updates available',
        color: 'info',
        position: 'top',
      })
    }
  } catch (error) {
    console.error('Error checking for updates:', error)
    Notify.create({
      message: 'Error checking for updates',
      color: 'negative',
      position: 'top',
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
