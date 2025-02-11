<template>
  <q-card class="full-width">
    <q-card-section class="row items-center justify-between">
      <div class="text-h6">{{ title }}</div>
      <q-btn icon="close" color="primary" flat round dense v-close-popup />
    </q-card-section>
    <q-separator />
    <slot></slot>
  </q-card>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'

defineProps({
  title: {
    type: String,
    required: true,
  },
})
</script>

<style scoped>
.full-width {
  width: 100vw !important;
  max-width: 100vw !important;
  margin: 0 !important;
  left: 0 !important;
  right: 0 !important;
}
</style>
