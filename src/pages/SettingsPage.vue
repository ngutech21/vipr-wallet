<template>
  <q-card class="full-width">
    <q-card-section class="row items-center justify-between">
      <div class="text-h6">Settings</div>
      <q-btn icon="close" flat round dense v-close-popup class="close-btn" color="primary" />
    </q-card-section>

    <q-separator />

    <q-card-section>
      <q-input filled label="Option 1" v-model="option1" />
      <q-input filled label="Option 2" v-model="option2" />
    </q-card-section>

    <q-separator />

    <q-card-section>
      <div class="text-subtitle1">App Version: {{ version }}</div>
      <div class="text-subtitle1">Quasar Version: {{ quasarVersion }}</div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { version } from '../../package.json'
import { version as quasarVersion } from 'quasar/package.json'

const option1 = ref('')
const option2 = ref('')
</script>

<style scoped>
.full-width {
  width: 100%;
}
.q-dialog__inner--minimized > div {
  max-width: 100%;
}
</style>
