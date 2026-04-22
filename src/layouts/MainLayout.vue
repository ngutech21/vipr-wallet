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
        inactive-color="white"
        align="justify"
        class="footer-tabs"
      >
        <q-route-tab
          name="home"
          icon="home"
          label="Home"
          to="/"
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
          to="/federations/"
          active-class="footer-route-active"
          exact-active-class="footer-route-active"
          :ripple="false"
          data-testid="nav-federations"
        />
        <q-route-tab
          name="settings"
          icon="settings"
          label="Settings"
          to="/settings/"
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
  background: rgba(26, 26, 26, 0.78);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border-top: 1px solid rgba(255, 255, 255, 0.02);
  box-shadow: 0 -6px 20px rgba(0, 0, 0, 0.14);
}

:deep(.footer-tabs) {
  padding-top: 2px;
}

:deep(.footer-tabs .q-tab) {
  min-height: 50px;
  border-radius: 18px;
  margin: 0 6px;
  padding: 4px 10px 4px;
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
  transition:
    color 160ms ease,
    opacity 160ms ease,
    transform 160ms ease,
    filter 160ms ease;
}

:deep(.q-tab__label) {
  font-size: 0.82rem;
  font-weight: 500;
  line-height: 1;
  margin-top: 2px;
  transition:
    color 160ms ease,
    opacity 160ms ease;
}

:deep(.footer-tabs .q-tab .q-focus-helper) {
  opacity: 0 !important;
  background: transparent !important;
}

:deep(.footer-tabs .q-tab:hover) {
  background: transparent !important;
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

:deep(.q-layout),
:deep(.q-page-container) {
  background: #141414;
}

:deep(.footer-container .footer-route-active),
:deep(.footer-container .q-tab--active) {
  color: #a970ff !important;
}

:deep(.footer-container .footer-route-active .q-tab__icon),
:deep(.footer-container .q-tab--active .q-tab__icon) {
  filter: drop-shadow(0 0 10px rgba(169, 112, 255, 0.24));
}

@media (max-width: 599px) {
  :deep(.footer-tabs .q-tab) {
    margin: 0 4px;
    min-height: 46px;
    padding: 3px 8px 3px;
  }

  :deep(.footer-tabs .q-tab__icon) {
    font-size: 1.3rem;
  }
}
</style>
