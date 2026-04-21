<template>
  <q-layout view="hHh lpR fFf" class="dark-gradient">
    <q-page-container>
      <PwaUpdateBanner />
      <!-- <q-page class="dark-gradient"> -->
      <slot />
      <!-- </q-page> -->
    </q-page-container>

    <q-footer v-if="showFooter" class="text-white footer-container ios-safe-area">
      <q-tabs
        no-caps
        indicator-color="transparent"
        active-color="primary"
        inactive-color="white"
        :model-value="currentTab"
        align="justify"
        class="footer-tabs"
      >
        <q-route-tab
          name="home"
          icon="home"
          label="Home"
          :to="{ name: '/' }"
          :ripple="false"
          data-testid="nav-home"
        />
        <q-route-tab
          name="federations"
          icon="account_balance"
          label="Federations"
          :to="{ name: '/federations/' }"
          :ripple="false"
          data-testid="nav-federations"
        />
        <q-route-tab
          name="settings"
          icon="settings"
          label="Settings"
          :to="{ name: '/settings/' }"
          :ripple="false"
          data-testid="nav-settings"
        />
      </q-tabs>
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import PwaUpdateBanner from 'src/components/PwaUpdateBanner.vue'

const route = useRoute()

const currentTab = computed(() => {
  switch (route.name) {
    case '/':
      return 'home'
    case '/federations/':
      return 'federations'
    case '/settings/':
      return 'settings'
    default:
      return null
  }
})
const showFooter = computed(() => route.meta?.hideBottomNav !== true)
</script>

<style scoped>
:deep(.footer-container) {
  background: rgba(26, 26, 26, 0.78);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border-top: 1px solid rgba(255, 255, 255, 0.02);
  box-shadow: 0 -6px 20px rgba(0, 0, 0, 0.14);
}

:deep(.footer-tabs) {
  padding-top: 8px;
}

:deep(.footer-tabs .q-tab) {
  min-height: 66px;
  border-radius: 18px;
  margin: 0 6px;
  padding: 8px 10px 10px;
  transition:
    color 160ms ease,
    transform 160ms ease;
}

:deep(.footer-tabs .q-tab__content) {
  gap: 4px;
}

:deep(.footer-tabs .q-tab__icon) {
  font-size: 1.45rem;
  opacity: 0.9;
}

:deep(.q-tab__label) {
  font-size: 0.82rem;
  font-weight: 500;
  line-height: 1;
  margin-top: 2px;
}

:deep(.q-tab--active .q-tab__icon) {
  transform: translateY(-1px);
}

.footer-container {
  padding-bottom: calc(env(safe-area-inset-bottom) + 16px);
  height: auto;
  min-height: 64px;
  margin-bottom: constant(safe-area-inset-bottom); /* iOS 11.0 */
  margin-bottom: env(safe-area-inset-bottom); /* iOS 11.2+ */
}

.ios-safe-area {
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

:deep(.footer-container .q-tab--active) {
  color: #a970ff !important;
}

:deep(.footer-container .q-tab--active .q-tab__icon) {
  filter: drop-shadow(0 0 10px rgba(169, 112, 255, 0.24));
}

@media (max-width: 599px) {
  :deep(.footer-tabs .q-tab) {
    margin: 0 4px;
    min-height: 62px;
    padding-inline: 8px;
  }

  :deep(.footer-tabs .q-tab__icon) {
    font-size: 1.35rem;
  }
}
</style>
