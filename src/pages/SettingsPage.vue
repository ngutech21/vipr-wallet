<template>
  <q-card class="q-px-md q-pt-md q-pb-xl">
    <q-card-section>
      <div class="text-h6">Settings</div>
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

    <q-card-section>
      <q-btn label="Close" color="primary" v-close-popup />
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
</style>
