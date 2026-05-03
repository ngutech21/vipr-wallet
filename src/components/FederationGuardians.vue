<template>
  <div>
    <button
      v-if="showHeader"
      type="button"
      class="guardian-header"
      :aria-expanded="isExpanded"
      @click="isExpanded = !isExpanded"
    >
      <q-icon name="shield" class="guardian-header__icon" />
      <span class="guardian-header__title">Guardians</span>
      <span class="guardian-count">{{ guardianCountLabel }}</span>
      <q-icon
        name="expand_more"
        class="guardian-header__chevron"
        :class="{ 'is-open': isExpanded }"
      />
    </button>

    <div v-show="isExpanded" class="guardian-card">
      <div v-if="guardians.length === 0" class="vipr-caption guardian-empty">
        No guardian information available.
      </div>

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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
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

const isExpanded = ref(true)

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
  width: 100%;
  display: grid;
  grid-template-columns: auto auto auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--vipr-space-2);
  padding: var(--vipr-space-2) 0;
  border: 0;
  border-bottom: 1px solid var(--vipr-detail-separator);
  background: transparent;
  color: var(--vipr-text-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.guardian-header__icon {
  color: var(--vipr-text-muted);
  font-size: 1rem;
}

.guardian-header__title {
  color: var(--vipr-text-primary);
  font-size: var(--vipr-font-size-body);
  font-weight: 700;
  line-height: var(--vipr-line-height-tight);
}

.guardian-header__chevron {
  color: var(--vipr-text-secondary);
  transform: rotate(-90deg);
  transition: transform 160ms ease-out;
}

.guardian-header__chevron.is-open {
  transform: rotate(180deg);
}

.guardian-list {
  background: transparent;
}

.guardian-card {
  border-bottom: 1px solid var(--vipr-detail-separator);
}

.guardian-empty {
  padding: var(--vipr-space-4) 0;
}

.guardian-row {
  min-height: 0;
  padding-top: var(--vipr-space-3);
  padding-bottom: var(--vipr-space-3);
}

.guardian-list :deep(.q-item) {
  color: var(--vipr-text-secondary);
}

.guardian-list :deep(.q-item + .q-item),
.guardian-list :deep(.q-item-type + .q-item-type) {
  border-top-color: var(--vipr-detail-separator);
}

.guardian-avatar {
  width: 38px;
  height: 38px;
  background: var(--vipr-row-icon-bg-subtle);
  border: 1px solid var(--vipr-surface-card-border-subtle);
  color: var(--vipr-text-secondary);
  font-size: var(--vipr-font-size-body);
}

.guardian-title {
  color: var(--vipr-text-primary);
  font-size: var(--vipr-font-size-caption);
  font-weight: 600;
  line-height: var(--vipr-line-height-tight);
}

.guardian-url {
  margin-top: var(--vipr-space-1);
  color: var(--vipr-text-soft);
  font-size: var(--vipr-font-size-label);
  line-height: var(--vipr-line-height-tight);
  word-break: break-all;
}
</style>
