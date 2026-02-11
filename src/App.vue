<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import { computed } from 'vue'
import MainLayout from 'src/layouts/MainLayout.vue'
import { useAppStore } from 'src/stores/app'

// default to MainLayout; allow pages to opt out with meta.layout = 'none'
const route = useRoute()
const useMainLayout = computed(() => route.meta?.layout !== 'none')
const appStore = useAppStore()
const appReadyAttribute = computed(() => (appStore.isReady ? 'true' : 'false'))
</script>

<template>
  <div :data-app-ready="appReadyAttribute">
    <RouterView v-slot="{ Component }">
      <MainLayout v-if="useMainLayout">
        <component :is="Component" />
      </MainLayout>
      <component v-else :is="Component" />
    </RouterView>
  </div>
</template>
