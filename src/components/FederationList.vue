<template>
  <q-list bordered padding>
    <q-item
      v-for="fedi in federations"
      :key="fedi.federationId"
      clickable
      @click="selectFederation(fedi)"
      :class="{ 'selected-federation': fedi.federationId === selectedFederation?.federationId }"
    >
      <q-item-section>
        <q-item-label>{{ fedi.title }}</q-item-label>
        <q-item-label caption>{{ fedi.federationId }}</q-item-label>
      </q-item-section>
    </q-item>
  </q-list>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useFederationStore } from 'src/stores/federation'
import type { Federation } from './models'

const store = useFederationStore()

onMounted(() => {
  store.loadSelectedFederation()
})

const federations = computed(() => store.federations)
const selectedFederation = computed(() => store.selectedFederation)

async function selectFederation(fedi: Federation) {
  await store.selectFederation(fedi)
}
</script>

<style scoped>
.selected-federation {
  background-color: var(--q-primary);
}
</style>
