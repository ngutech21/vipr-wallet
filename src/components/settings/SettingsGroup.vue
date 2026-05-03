<template>
  <section class="settings-group" :data-testid="dataTestid">
    <div class="settings-group__header">
      <div class="settings-group__title">{{ title }}</div>
      <div v-if="caption" class="settings-group__caption">{{ caption }}</div>
    </div>

    <div class="settings-group__content">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineOptions({
  name: 'SettingsGroup',
})

defineProps<{
  title: string
  caption?: string
  dataTestid?: string
}>()
</script>
