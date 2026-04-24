<template>
  <q-layout view="hHh lpR fFf" class="app-layout">
    <q-page-container>
      <PwaUpdateBanner />
      <!-- <q-page class="dark-gradient"> -->
      <slot />
      <!-- </q-page> -->
    </q-page-container>

    <q-footer v-if="showFooter" class="text-white footer-container ios-safe-area">
      <q-tabs
        no-caps
        active-color="primary"
        indicator-color="transparent"
        inactive-color="white"
        align="justify"
        class="footer-tabs"
      >
        <q-route-tab
          name="home"
          icon="home"
          label="Home"
          :to="{ name: '/' }"
          active-class="footer-route-active"
          exact-active-class="footer-route-active"
          exact
          :ripple="false"
          data-testid="nav-home"
        />
        <q-route-tab
          name="federations"
          icon="account_balance"
          label="Federations"
          :to="{ name: '/federations/' }"
          active-class="footer-route-active"
          exact-active-class="footer-route-active"
          :ripple="false"
          data-testid="nav-federations"
        />
        <q-route-tab
          name="settings"
          icon="settings"
          label="Settings"
          :to="{ name: '/settings/' }"
          active-class="footer-route-active"
          exact-active-class="footer-route-active"
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

const showFooter = computed(() => route.meta?.hideBottomNav !== true)
</script>

<style scoped>
:deep(.footer-container) {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.018)),
    rgba(15, 16, 22, 0.96);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.025);
  box-shadow:
    0 -4px 14px rgba(0, 0, 0, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.02);
}

:deep(.footer-tabs) {
  padding: 8px 12px 6px;
}

:deep(.footer-tabs .q-tab) {
  min-height: 56px;
  border: 1px solid transparent;
  border-radius: 15px;
  margin: 0 6px;
  padding: 6px 10px;
  background: transparent !important;
  box-shadow: none !important;
  color: rgba(255, 255, 255, 0.68);
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    transform 160ms ease;
}

:deep(.footer-tabs .q-tab__content) {
  gap: 5px;
}

:deep(.footer-tabs .q-tab__icon) {
  font-size: 1.48rem;
  opacity: 0.82;
  transition:
    color 160ms ease,
    opacity 160ms ease,
    transform 160ms ease,
    filter 160ms ease;
}

:deep(.q-tab__label) {
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 1;
  margin-top: 2px;
  transition:
    color 160ms ease,
    opacity 160ms ease;
}

:deep(.footer-tabs .q-tab .q-focus-helper),
:deep(.footer-tabs .q-tab .q-ripple) {
  display: none !important;
  opacity: 0 !important;
  background: transparent !important;
}

:deep(.footer-tabs .q-tab:hover) {
  background: rgba(255, 255, 255, 0.035) !important;
}

:deep(.footer-tabs .q-tab:hover .q-tab__icon),
:deep(.footer-tabs .q-tab:hover .q-tab__label) {
  color: rgba(255, 255, 255, 0.92);
  opacity: 1;
}

:deep(.footer-route-active .q-tab__icon),
:deep(.q-tab--active .q-tab__icon) {
  transform: translateY(-1px);
}

.footer-container {
  padding-bottom: 4px;
  padding-bottom: max(4px, calc(env(safe-area-inset-bottom) - 22px));
  height: auto;
  min-height: 0;
}

.ios-safe-area {
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

.app-layout,
:deep(.q-page-container) {
  background: #141414;
}

:deep(.footer-container .footer-route-active),
:deep(.footer-container .q-tab--active) {
  border-color: transparent;
  background: transparent !important;
  box-shadow: none !important;
  color: rgba(255, 255, 255, 0.68) !important;
}

:deep(.footer-container .q-tab--active .q-focus-helper),
:deep(.footer-container .footer-route-active .q-focus-helper) {
  display: none !important;
  opacity: 0 !important;
  background: transparent !important;
}

:deep(.footer-container .footer-route-active .q-tab__icon),
:deep(.footer-container .q-tab--active .q-tab__icon) {
  color: #a970ff;
  opacity: 1;
  filter: none;
}

:deep(.footer-container .footer-route-active .q-tab__label),
:deep(.footer-container .q-tab--active .q-tab__label) {
  color: #a970ff;
  font-weight: 600;
  opacity: 1;
}

@media (max-width: 599px) {
  :deep(.footer-tabs .q-tab) {
    margin: 0 4px;
    min-height: 54px;
    padding: 5px 8px;
  }

  :deep(.footer-tabs .q-tab__icon) {
    font-size: 1.42rem;
  }
}
</style>
