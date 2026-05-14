<template>
  <div
    v-if="modules.length > 0"
    class="federation-module-chips"
    :class="{ 'federation-module-chips--scroll': scroll }"
    aria-label="Supported modules"
  >
    <q-chip
      v-for="module in modules"
      :key="module.kind"
      size="sm"
      class="vipr-chip vipr-chip--positive federation-module-chip"
    >
      {{ module.kind }}
    </q-chip>
  </div>
</template>

<script setup lang="ts">
import type { ModuleConfig } from 'src/types/federation'

defineOptions({
  name: 'FederationModuleChips',
})

withDefaults(
  defineProps<{
    modules: ModuleConfig[]
    scroll?: boolean
  }>(),
  {
    scroll: false,
  },
)
</script>

<style scoped>
.federation-module-chips {
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  gap: var(--vipr-space-2);
}

.federation-module-chips--scroll {
  flex-wrap: nowrap;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
}

.federation-module-chips--scroll::-webkit-scrollbar {
  display: none;
}

.federation-module-chip {
  flex: 0 0 auto;
  margin: 0;
  min-width: 0;
  height: 28px;
  padding: 0 var(--vipr-space-3);
  font-size: var(--vipr-font-size-label);
  font-weight: 600;
  line-height: var(--vipr-line-height-tight);
}

.federation-module-chip :deep(.q-chip__content) {
  flex: 0 0 auto;
  justify-content: center;
  padding: 0;
  white-space: nowrap;
}

@media (max-width: 599px) {
  .federation-module-chip {
    height: 30px;
    font-size: var(--vipr-font-size-caption);
  }
}
</style>
