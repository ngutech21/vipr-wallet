<template>
  <q-list bordered padding v-if="federations.length > 0">
    <q-item
      v-for="fedi in federations"
      :key="fedi.inviteCode"
      clickable
      @click="selectFederation(fedi)"
      :class="{ 'selected-federation': fedi.inviteCode === selectedFederation?.inviteCode }"
    >
      <q-item-section class="federation-item">
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
  try {
    await store.selectFederation(fedi)
  } catch (error) {
    console.error('Error selecting federation:', error)
  }
}
</script>

<style scoped>
.selected-federation {
  background-color: var(--q-primary);
}
</style>
