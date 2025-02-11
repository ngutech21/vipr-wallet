<template>
  <q-card class="full-width">
    <q-card-section class="row items-center justify-between">
      <div class="text-h6">Settings</div>
      <q-btn icon="close" flat round dense v-close-popup class="close-btn" color="primary" />
    </q-card-section>

    <q-separator />

    <q-card-section>
      <div class="text-subtitle1">App Version: {{ version }}</div>
      <div class="text-subtitle1">Quasar Version: {{ quasarVersion }}</div>
    </q-card-section>
    <q-separator />
  </q-card>
</template>

<script setup lang="ts">
import { version } from '../../package.json'
import { version as quasarVersion } from 'quasar/package.json'
</script>

<style scoped>
.full-width {
  width: 100%;
}
.q-dialog__inner--minimized > div {
  max-width: 100%;
}
</style>
