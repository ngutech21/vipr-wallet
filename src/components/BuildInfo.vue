<template>
  <div class="text-subtitle1">Build: {{ commitHash }} ({{ buildTime }})</div>
</template>

<script setup lang="ts">
const commitHash = import.meta.env.VITE_COMMIT_HASH
const buildTime = import.meta.env.VITE_BUILD_TIME
</script>
