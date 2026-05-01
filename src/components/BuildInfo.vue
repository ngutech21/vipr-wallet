<template>
  <div class="text-subtitle1 build-info">
    <div data-testid="build-info-version">Release Version: {{ appVersion }}</div>
    <div data-testid="build-info-commit">Commit SHA: {{ commitHash }}</div>
    <div v-if="isDev" data-testid="build-info-debug">Debug: {{ envDebug }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const appVersion = import.meta.env.VITE_APP_VERSION
const commitHash = import.meta.env.VITE_COMMIT_HASH
const isDev = import.meta.env.DEV
const envDebug = computed(() => JSON.stringify(import.meta.env, null, 2))
</script>
