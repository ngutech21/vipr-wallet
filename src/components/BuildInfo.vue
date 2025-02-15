<template>
  <div class="text-subtitle1">
    Build: {{ commitHash }} ({{ buildTime }})
    <div v-if="isDev">Debug: {{ envDebug }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const commitHash = import.meta.env.VITE_COMMIT_HASH
const buildTime = import.meta.env.VITE_BUILD_TIME
const isDev = import.meta.env.DEV
const envDebug = computed(() => JSON.stringify(import.meta.env, null, 2))

console.log('ENV:', import.meta.env) // Debug log
</script>
