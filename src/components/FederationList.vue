<template>
  <q-list bordered padding v-if="federations.length > 0">
    <q-item
      v-for="fedi in federations"
      :key="fedi.federationId"
      :class="{ 'selected-federation': isSelected(fedi) }"
    >
      <q-item-section class="federation-item cursor-pointer" @click="selectFederation(fedi)">
        <q-item-label class="row items-center">
          <q-img :src="fedi.icon_url" class="federation-icon q-mr-md" no-transition />
          <span>{{ fedi.title }}</span>
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-btn
          flat
          round
          icon="arrow_forward"
          :to="{ name: 'federation-details', params: { id: fedi.federationId } }"
        />
      </q-item-section>
    </q-item>
  </q-list>
</template>

<script setup lang="ts">
import { useFederationStore } from 'src/stores/federation'
import type { Federation } from './models'
import { storeToRefs } from 'pinia'

const store = useFederationStore()
const { federations, selectedFederation } = storeToRefs(store)

async function selectFederation(fedi: Federation) {
  try {
    await store.selectFederation(fedi)
  } catch (error) {
    console.error('Error selecting federation:', error)
  }
}
function isSelected(fedi: Federation): boolean {
  return fedi.federationId === selectedFederation.value?.federationId
}
</script>

<style scoped>
.selected-federation {
  background-color: var(--q-primary);
}
.federation-item {
  flex: 1;
}

.cursor-pointer {
  cursor: pointer;
}
.federation-icon {
  height: 32px;
  width: 32px;
  border-radius: 4px;
}
</style>
