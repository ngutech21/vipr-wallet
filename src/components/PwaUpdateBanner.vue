<template>
  <q-banner
    v-if="showBanner"
    rounded
    class="pwa-update-banner text-white q-mx-md q-mt-md"
    data-testid="pwa-update-banner"
  >
    <div class="pwa-update-banner__content">
      <div class="pwa-update-banner__copy">
        <div class="pwa-update-banner__title">Update available</div>
        <div class="pwa-update-banner__status" data-testid="pwa-update-banner-status">
          {{ statusText }}
        </div>
      </div>
      <div class="pwa-update-banner__action">
        <q-btn
          no-caps
          unelevated
          label="Update now"
          :loading="isApplying"
          :disable="isApplying"
          class="pwa-update-banner__button vipr-btn vipr-btn--primary-soft vipr-btn--compact"
          @click="applyUpdate"
          data-testid="pwa-update-apply-btn"
        />
      </div>
    </div>
  </q-banner>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAppNotify } from 'src/composables/useAppNotify'
import { usePwaUpdateStore } from 'src/stores/pwa-update'

const route = useRoute()
const pwaUpdateStore = usePwaUpdateStore()
const notify = useAppNotify()

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
    notify.error('Update failed. Tap "Update now" again.')
    return
  }

  if (result === 'checking') {
    notify.info('Update is still downloading. Please try again shortly.')
    return
  }

  if (result === 'no-update') {
    notify.info('No update is ready right now.')
    return
  }

  if (result === 'blocked-route') {
    notify.warning('Update can only be applied on Home or Settings.')
  }
}
</script>

<style scoped>
.pwa-update-banner {
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
  background:
    radial-gradient(circle at top left, rgba(156, 39, 255, 0.14), transparent 42%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.pwa-update-banner__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.pwa-update-banner__copy {
  min-width: 0;
}

.pwa-update-banner__title {
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.2;
}

.pwa-update-banner__status {
  margin-top: 3px;
  color: rgba(255, 255, 255, 0.62);
  font-size: 0.82rem;
  line-height: 1.35;
}

.pwa-update-banner__action {
  flex: 0 0 auto;
}

.pwa-update-banner__button {
  font-weight: 600;
}

@media (max-width: 599px) {
  .pwa-update-banner__content {
    align-items: stretch;
    flex-direction: column;
    gap: 12px;
  }

  .pwa-update-banner__button {
    width: 100%;
  }
}
</style>
