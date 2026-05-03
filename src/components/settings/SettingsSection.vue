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
    <template v-else-if="status" #header>
      <q-item-section avatar>
        <q-icon v-if="icon" :name="icon" />
      </q-item-section>
      <q-item-section>
        <q-item-label>{{ label }}</q-item-label>
        <q-item-label v-if="caption" caption>{{ caption }}</q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-badge class="settings-status-pill" :class="statusClass">
          {{ status }}
        </q-badge>
      </q-item-section>
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
    status?: string | undefined
    statusTone?: 'neutral' | 'positive' | 'warning' | 'danger'
    compact?: boolean
    expandIconClass?: string
  }>(),
  {
    variant: 'primary',
    icon: undefined,
    label: undefined,
    caption: undefined,
    status: undefined,
    statusTone: 'neutral',
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
const statusClass = computed(() => `settings-status-pill--${props.statusTone}`)
</script>
