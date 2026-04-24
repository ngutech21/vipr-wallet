<template>
  <div class="text-subtitle1 build-info">
    <div data-testid="build-info-version">Release Version: {{ appVersion }}</div>
    <div data-testid="build-info-commit">Commit SHA: {{ commitHash }}</div>
    <div data-testid="build-info-time">Build Time: {{ formattedBuildTime }}</div>
    <div v-if="isDev" data-testid="build-info-debug">Debug: {{ envDebug }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const appVersion = import.meta.env.VITE_APP_VERSION
const commitHash = import.meta.env.VITE_COMMIT_HASH
const buildTime = import.meta.env.VITE_BUILD_TIME
const isDev = import.meta.env.DEV
const envDebug = computed(() => JSON.stringify(import.meta.env, null, 2))
const formattedBuildTime = computed(() => formatBuildTime(buildTime))

function formatBuildTime(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    return String(value)
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  const datePart = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'UTC',
  }).format(date)

  return `${datePart}, ${timePart} UTC`
}
</script>
