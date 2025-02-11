<template>
  <ModalCard title="Settings">
    <q-card class="full-width">
      <q-card-section>
        <div class="text-subtitle1">App Version: {{ version }}</div>
        <div class="text-subtitle1">Quasar Version: {{ quasarVersion }}</div>
      </q-card-section>
      <q-separator />
    </q-card>
  </ModalCard>
</template>

<script setup lang="ts">
import ModalCard from 'src/components/ModalCard.vue'
import { version } from '../../package.json'
import { version as quasarVersion } from 'quasar/package.json'
</script>

<style scoped>
.full-width {
  width: 100%;
}
</style>
