<template>
  <q-layout view="hHh lpR fFf" class="app-shell">
    <q-page-container
      class="app-shell__page-container"
      :class="{ 'app-shell__page-container--safe-top': useTopSafeArea }"
    >
      <PwaUpdateBanner />
      <!-- <q-page class="dark-gradient"> -->
      <slot />
      <!-- </q-page> -->
    </q-page-container>

    <q-footer v-if="showFooter" class="text-white footer-container ios-safe-area dark-bg">
      <q-tabs
        no-caps
        indicator-color="transparent"
        active-color="primary"
        inactive-color="white"
        :model-value="currentTab"
        align="justify"
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
const useTopSafeArea = computed(() => route.name !== '/scan')
</script>

<style scoped>
.app-shell {
  background-color: var(--app-surface-bg);
}

.app-shell__page-container {
  background-color: var(--app-chrome-bg);
  min-height: 100%;
}

.app-shell__page-container--safe-top {
  padding-top: env(safe-area-inset-top, 0px);
}

:deep(.q-tab__label) {
  font-size: 0.8rem;
  line-height: 1;
  margin-top: 4px;
}

:deep(.q-tab--active .q-tab__icon) {
  transform: translateY(-1px);
}

.dark-bg {
  background-color: var(--app-chrome-bg);
}

.footer-container {
  padding-bottom: calc(env(safe-area-inset-bottom) + 20px);
  height: auto;
  min-height: 60px;
  /* Ensure content doesn't overflow into safe area */
  margin-bottom: constant(safe-area-inset-bottom); /* iOS 11.0 */
  margin-bottom: env(safe-area-inset-bottom); /* iOS 11.2+ */
}

.ios-safe-area {
  /* Ensure the entire footer respects the safe area */
  padding-bottom: max(15px, env(safe-area-inset-bottom));
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

:deep(.footer-container .q-tab--active) {
  color: #a970ff !important;
}
</style>
