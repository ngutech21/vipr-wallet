<template>
  <q-card class="full-width">
    <q-card-section class="row items-center">
      <div style="width: 40px"></div>
      <div class="text-h6 col full-width text-center">{{ title }}</div>
      <q-btn icon="close" color="primary" class="q-ml-sm" flat round dense v-close-popup />
    </q-card-section>
    <q-separator />
    <slot></slot>
  </q-card>
</template>

<script setup lang="ts">
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
