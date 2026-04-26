<template>
  <span class="federation-avatar" aria-hidden="true">
    <q-img
      v-if="federation?.metadata?.federation_icon_url"
      :src="federation.metadata.federation_icon_url"
      class="federation-avatar__image"
      loading="eager"
      no-spinner
      no-transition
    />
    <q-icon v-else name="account_balance" class="federation-avatar__icon" />
  </span>
</template>

<script setup lang="ts">
import type { Federation } from 'src/types/federation'

defineProps<{
  federation?: Federation | null | undefined
}>()
</script>

<style scoped>
.federation-avatar {
  width: var(--vipr-control-height-md);
  height: var(--vipr-control-height-md);
  border-radius: var(--vipr-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--vipr-control-panel-bg);
  border: 1px solid var(--vipr-color-surface-border);
  color: var(--vipr-text-secondary);
}

.federation-avatar__image {
  width: 100%;
  height: 100%;
}

.federation-avatar__icon {
  font-size: var(--vipr-font-size-icon-lg);
}
</style>
