<template>
  <q-banner
    v-if="showBanner"
    rounded
    class="pwa-update-banner bg-primary text-white q-mx-md q-mt-md"
    data-testid="pwa-update-banner"
  >
    <div class="row items-center justify-between no-wrap q-col-gutter-sm">
      <div class="col">
        <div class="text-subtitle2 text-weight-medium">Update available</div>
        <div class="text-caption" data-testid="pwa-update-banner-status">
          {{ statusText }}
        </div>
      </div>
      <div class="col-auto">
        <q-btn
          color="white"
          text-color="primary"
          label="Update now"
          :loading="isApplying"
          :disable="isApplying"
          @click="applyUpdate"
          data-testid="pwa-update-apply-btn"
        />
      </div>
    </div>
  </q-banner>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Notify } from 'quasar'
import { useRoute } from 'vue-router'
import { usePwaUpdateStore } from 'src/stores/pwa-update'

const route = useRoute()
const pwaUpdateStore = usePwaUpdateStore()

const isApplying = computed(() => pwaUpdateStore.state === 'applying')
const showBanner = computed(
  () => pwaUpdateStore.isUpdateReady && pwaUpdateStore.canApplyOnRoute(route.name),
)
const statusText = computed(() =>
  isApplying.value ? 'Applying update...' : 'Tap once to install the update.',
)

async function applyUpdate() {
  const result = await pwaUpdateStore.applyUpdate(route.name)

  if (result === 'error') {
    Notify.create({
      color: 'negative',
      position: 'top',
      message: 'Update failed. Tap "Update now" again.',
    })
    return
  }

  if (result === 'checking') {
    Notify.create({
      color: 'info',
      position: 'top',
      message: 'Update is still downloading. Please try again shortly.',
    })
    return
  }

  if (result === 'no-update') {
    Notify.create({
      color: 'info',
      position: 'top',
      message: 'No update is ready right now.',
    })
    return
  }

  if (result === 'blocked-route') {
    Notify.create({
      color: 'warning',
      position: 'top',
      message: 'Update can only be applied on Home or Settings.',
    })
  }
}
</script>

<style scoped>
.pwa-update-banner {
  border: 1px solid rgba(255, 255, 255, 0.2);
}
</style>
