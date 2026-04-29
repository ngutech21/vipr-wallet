<template>
  <q-expansion-item
    class="settings-section settings-section--secondary"
    icon="update"
    label="Updates"
    caption="Check for updates"
    header-class="settings-header"
    expand-icon-class="text-primary"
  >
    <q-card>
      <q-card-section class="settings-panel settings-panel--secondary">
        <div class="settings-copy-block settings-block">
          <BuildInfo />
        </div>

        <div>
          <q-btn
            :label="updateButtonLabel"
            :icon="updateButtonIcon"
            color="primary"
            no-caps
            unelevated
            @click="handleUpdateAction"
            class="settings-action-full"
            data-testid="settings-check-updates-btn"
            :loading="isUpdateActionRunning"
            :disable="isUpdateActionRunning"
          />
          <div v-if="showApplyRestrictionHint" class="settings-warning">
            Update is ready. Open Home or Settings to apply safely.
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-expansion-item>
</template>

<script setup lang="ts">
defineOptions({
  name: 'PwaUpdateSettings',
})

import { computed } from 'vue'
import { useRoute } from 'vue-router'
import BuildInfo from 'src/components/BuildInfo.vue'
import { useAppNotify } from 'src/composables/useAppNotify'
import { usePwaUpdateStore } from 'src/stores/pwa-update'

const pwaUpdateStore = usePwaUpdateStore()
const route = useRoute()
const notify = useAppNotify()

const isUpdateReady = computed(() => pwaUpdateStore.isUpdateReady)
const isCheckingForUpdates = computed(() => pwaUpdateStore.state === 'checking')
const isApplyingUpdate = computed(() => pwaUpdateStore.state === 'applying')
const isUpdateActionRunning = computed(() => isCheckingForUpdates.value || isApplyingUpdate.value)
const canApplyUpdateHere = computed(() => pwaUpdateStore.canApplyOnRoute(route.name))
const showApplyRestrictionHint = computed(() => isUpdateReady.value && !canApplyUpdateHere.value)
const updateButtonLabel = computed(() =>
  isUpdateReady.value ? 'Update ready' : 'Check for updates',
)
const updateButtonIcon = computed(() => (isUpdateReady.value ? 'update' : 'refresh'))

async function handleUpdateAction() {
  if (isUpdateReady.value) {
    await applyUpdate()
  } else {
    await checkForUpdates()
  }
}

async function checkForUpdates() {
  const result = await pwaUpdateStore.checkForUpdatesManual()

  if (result === 'update-ready') {
    notify.success('Update ready')
    return
  }

  if (result === 'up-to-date') {
    notify.info('No updates available')
    return
  }

  if (result === 'checking') {
    notify.info('Update is downloading in the background')
    return
  }

  if (result === 'not-supported') {
    notify.error('Service Worker not supported')
    return
  }

  if (result === 'not-registered') {
    notify.warning('Service Worker not registered')
    return
  }

  notify.error(pwaUpdateStore.lastError ?? 'Error checking for updates')
}

async function applyUpdate() {
  const result = await pwaUpdateStore.applyUpdate(route.name)

  if (result === 'blocked-route') {
    notify.warning('Update is ready. Open Home or Settings to apply safely.')
    return
  }

  if (result === 'no-update') {
    notify.info('No update is ready yet')
    return
  }

  if (result === 'checking') {
    notify.info('Update is downloading in the background')
    return
  }

  if (result === 'not-supported') {
    notify.error('Service Worker not supported')
    return
  }

  if (result === 'error') {
    notify.error(pwaUpdateStore.lastError ?? 'Error applying update')
  }
}
</script>
