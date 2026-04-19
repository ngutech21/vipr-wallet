<template>
  <div>
    <div v-if="showHeader" class="text-subtitle1 q-mb-xs">
      Guardians
      <span class="text-grey-6 q-ml-xs">{{ guardianCountLabel }}</span>
    </div>

    <q-card flat class="guardian-card">
      <q-card-section v-if="guardians.length === 0" class="text-grey-6">
        No guardian information available.
      </q-card-section>

      <q-list v-else separator class="guardian-list">
        <q-item v-for="guardian in guardians" :key="guardian.peerId" class="q-py-md">
          <q-item-section avatar top>
            <q-avatar color="grey-3" text-color="grey-8">
              {{ guardian.peerId + 1 }}
            </q-avatar>
          </q-item-section>

          <q-item-section>
            <q-item-label class="text-body1 text-weight-medium">
              {{ guardianLabel(guardian) }}
            </q-item-label>
            <q-item-label caption class="guardian-url">
              {{ guardian.url }}
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FederationGuardian } from 'src/types/federation'

const props = withDefaults(
  defineProps<{
    guardians: FederationGuardian[]
    showHeader?: boolean
  }>(),
  {
    showHeader: true,
  },
)

const guardianCountLabel = computed(() => {
  const count = props.guardians.length
  return `${count} of ${count} Federation`
})

function guardianLabel(guardian: FederationGuardian): string {
  return guardian.name !== '' ? guardian.name : `Guardian ${guardian.peerId}`
}
</script>

<style scoped>
.guardian-card {
  background: #232323;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.guardian-list {
  background: #232323;
}

.guardian-url {
  word-break: break-all;
}
</style>
