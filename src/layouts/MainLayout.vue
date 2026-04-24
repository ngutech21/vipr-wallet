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
        :model-value="currentTab"
        align="justify"
        class="footer-tabs"
      >
        <q-tab
          name="home"
          icon="home"
          label="Home"
          :ripple="false"
          data-testid="nav-home"
          @click="goToTab('/')"
        />
        <q-tab
          name="federations"
          icon="account_balance"
          label="Federations"
          :ripple="false"
          data-testid="nav-federations"
          @click="goToTab('/federations/')"
        />
        <q-tab
          name="settings"
          icon="settings"
          label="Settings"
          :ripple="false"
          data-testid="nav-settings"
          @click="goToTab('/settings/')"
        />
      </q-tabs>
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter, type RouteRecordName } from 'vue-router'

import PwaUpdateBanner from 'src/components/PwaUpdateBanner.vue'

const route = useRoute()
const router = useRouter()

const showFooter = computed(() => route.meta?.hideBottomNav !== true)
const currentTab = computed<'home' | 'federations' | 'settings' | null>(() => {
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

async function goToTab(name: RouteRecordName): Promise<void> {
  if (route.name === name) {
    return
  }

  await router.push({ name })
}
</script>

<style scoped>
:deep(.footer-container) {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.018), transparent 18px),
    linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.018)),
    rgba(15, 16, 22, 0.96);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.012);
  box-shadow:
    0 -6px 18px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.008);
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
  background: transparent !important;
}

:deep(.footer-tabs .q-tab:hover .q-tab__icon),
:deep(.footer-tabs .q-tab:hover .q-tab__label) {
  color: rgba(255, 255, 255, 0.92);
  opacity: 1;
}

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

:deep(.footer-container .q-tab--active .q-focus-helper) {
  display: none !important;
  opacity: 0 !important;
  background: transparent !important;
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

:deep(.footer-container .q-tab--active) {
  background: transparent !important;
  box-shadow: none !important;
  color: #a970ff !important;
}

:deep(.footer-container .q-tab--active .q-tab__icon),
:deep(.footer-container .q-tab--active .q-tab__label) {
  color: inherit !important;
  opacity: 1;
}

:deep(.footer-container .q-tab--active .q-tab__label) {
  font-weight: 600;
}
</style>
