<script setup lang="ts">
import { RouterView } from 'vue-router'
import { computed } from 'vue'
import MainLayout from 'src/layouts/MainLayout.vue'
import { useAppStore } from 'src/stores/app'

const appStore = useAppStore()
const appReadyAttribute = computed(() => (appStore.isReady ? 'true' : 'false'))
</script>

<template>
  <div :data-app-ready="appReadyAttribute">
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
  </div>
</template>
