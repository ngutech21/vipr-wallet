<template>
  <div>
    <div v-if="showHeader" class="guardian-header vipr-section-title">
      Guardians
      <span class="guardian-count">{{ guardianCountLabel }}</span>
    </div>

    <q-card flat class="guardian-card vipr-surface-card vipr-surface-card--subtle">
      <q-card-section v-if="guardians.length === 0" class="vipr-caption">
        No guardian information available.
      </q-card-section>

      <q-list v-else separator class="guardian-list">
        <q-item v-for="guardian in guardians" :key="guardian.peerId" class="guardian-row">
          <q-item-section avatar top>
            <q-avatar class="guardian-avatar">
              {{ guardian.peerId + 1 }}
            </q-avatar>
          </q-item-section>

          <q-item-section>
            <q-item-label class="guardian-title">
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
  return `${count}`
})

function guardianLabel(guardian: FederationGuardian): string {
  return guardian.name !== '' ? guardian.name : `Guardian ${guardian.peerId}`
}
</script>

<style scoped>
.guardian-count {
  margin-left: var(--vipr-space-1);
  color: var(--vipr-text-muted);
  font-weight: 500;
}

.guardian-header {
  margin-bottom: var(--vipr-space-1);
}

.guardian-list {
  background: transparent;
}

.guardian-row {
  padding-top: var(--vipr-row-padding-y);
  padding-bottom: var(--vipr-row-padding-y);
}

.guardian-list :deep(.q-item) {
  color: var(--vipr-text-secondary);
}

.guardian-list :deep(.q-item + .q-item),
.guardian-list :deep(.q-item-type + .q-item-type) {
  border-top-color: var(--vipr-detail-separator);
}

.guardian-avatar {
  background: var(--vipr-row-icon-bg-subtle);
  border: 1px solid var(--vipr-surface-card-border-subtle);
  color: var(--vipr-text-secondary);
}

.guardian-title {
  color: var(--vipr-text-primary);
  font-size: var(--vipr-font-size-body);
  font-weight: 600;
}

.guardian-url {
  color: var(--vipr-text-soft);
  word-break: break-all;
}
</style>
