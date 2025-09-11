<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import { computed } from 'vue'
import MainLayout from 'src/layouts/MainLayout.vue'

// default to MainLayout; allow pages to opt out with meta.layout = 'none'
const route = useRoute()
const useMainLayout = computed(() => route.meta?.layout !== 'none')
</script>

<template>
  <RouterView v-slot="{ Component }">
    <MainLayout v-if="useMainLayout">
      <component :is="Component" />
    </MainLayout>
    <component v-else :is="Component" />
  </RouterView>
</template>
