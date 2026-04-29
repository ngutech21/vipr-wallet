<template>
  <q-expansion-item
    v-bind="$attrs"
    :class="sectionClasses"
    :icon="icon"
    :label="label"
    :caption="caption"
    :header-class="headerClassValue"
    :expand-icon-class="expandIconClass"
  >
    <template v-if="$slots.header" #header>
      <slot name="header" />
    </template>

    <q-card>
      <q-card-section :class="panelClasses">
        <slot />
      </q-card-section>
    </q-card>
  </q-expansion-item>
</template>

<script setup lang="ts">
defineOptions({
  name: 'SettingsSection',
  inheritAttrs: false,
})

import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'danger'
    icon?: string | undefined
    label?: string | undefined
    caption?: string | undefined
    compact?: boolean
    expandIconClass?: string
  }>(),
  {
    variant: 'primary',
    icon: undefined,
    label: undefined,
    caption: undefined,
    compact: false,
    expandIconClass: 'text-primary',
  },
)

const sectionClasses = computed(() => ['settings-section', `settings-section--${props.variant}`])

const panelClasses = computed(() => [
  'settings-panel',
  {
    'settings-panel--compact': props.compact,
    'settings-panel--secondary': props.variant === 'secondary',
    'settings-panel--danger': props.variant === 'danger',
  },
])

const headerClassValue = computed(() =>
  props.variant === 'danger' ? 'settings-header danger-header' : 'settings-header',
)
</script>
