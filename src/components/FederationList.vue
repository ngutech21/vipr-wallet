<template>
  <!-- <q-item-section v-if="icon" avatar>
      <q-icon :name="icon" />
    </q-item-section> -->

  <q-item-section>
    <q-item-label>{{ title }}</q-item-label>
    <q-item-label caption>{{ balance }} (Sats)</q-item-label>
  </q-item-section>
</template>

<script setup lang="ts">
export interface Federation {
  title: string
  balance: number
}

withDefaults(defineProps<Federation>(), {
  title: '',
  balance: 0,
})
</script>
