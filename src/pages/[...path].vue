<route lang="yaml">
name: not-found
meta:
  hideBottomNav: true
  layout: none # remove if you want MainLayout/footer on 404
</route>

<template>
  <ErrorNotFound />
</template>

<script setup lang="ts">
import ErrorNotFound from 'src/pages/ErrorNotFound.vue'
</script>
