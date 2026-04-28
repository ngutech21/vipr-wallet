<script setup lang="ts">
import { RouterView } from 'vue-router'
import { computed } from 'vue'
import MainLayout from 'src/layouts/MainLayout.vue'
import AppLockOverlay from 'src/components/AppLockOverlay.vue'
import { useAppStore } from 'src/stores/app'

const appStore = useAppStore()
const appReadyAttribute = computed(() => (appStore.isReady ? 'true' : 'false'))
</script>

<template>
  <div class="app-root" :data-app-ready="appReadyAttribute">
    <div class="app-statusbar-fill" aria-hidden="true" />
    <RouterView v-slot="{ Component, route }">
      <MainLayout
        v-if="Component && route.meta?.layout !== 'none'"
        :key="`layout:${String(route.name)}:${route.fullPath}`"
      >
        <component :is="Component" :key="route.fullPath" />
      </MainLayout>
      <component
        v-else-if="Component"
        :is="Component"
        :key="`plain:${String(route.name)}:${route.fullPath}`"
      />
    </RouterView>
    <AppLockOverlay />
  </div>
</template>

<style scoped>
.app-root {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--vipr-color-page);
}

.app-statusbar-fill {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  height: env(safe-area-inset-top);
  pointer-events: none;
  background: var(--vipr-color-page);
}
</style>
