<template>
  <q-item
    v-ripple
    clickable
    class="settings-row"
    :class="rowClasses"
    :to="to"
    :href="href"
    :target="target"
    :rel="rel"
    :data-testid="dataTestid"
    @click="emit('select')"
  >
    <q-item-section avatar class="settings-row__avatar">
      <q-icon :name="icon" />
    </q-item-section>

    <q-item-section class="settings-row__copy">
      <q-item-label class="settings-row__label">{{ label }}</q-item-label>
      <q-item-label caption class="settings-row__caption">{{ caption }}</q-item-label>
    </q-item-section>

    <q-item-section side class="settings-row__side">
      <q-badge v-if="status" class="settings-status-pill" :class="statusClass">
        {{ status }}
      </q-badge>
      <q-icon :name="trailingIcon" class="settings-row__trailing-icon" />
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

defineOptions({
  name: 'SettingsRow',
})

const props = withDefaults(
  defineProps<{
    icon: string
    label: string
    caption: string
    status?: string | undefined
    statusTone?: 'neutral' | 'positive' | 'warning' | 'danger'
    to?: RouteLocationRaw | undefined
    href?: string | undefined
    target?: string | undefined
    rel?: string | undefined
    external?: boolean
    danger?: boolean
    dataTestid?: string | undefined
  }>(),
  {
    status: undefined,
    statusTone: 'neutral',
    to: undefined,
    href: undefined,
    target: undefined,
    rel: undefined,
    external: false,
    danger: false,
    dataTestid: undefined,
  },
)

const emit = defineEmits<{
  select: []
}>()

const rowClasses = computed(() => ({
  'settings-row--danger': props.danger,
}))

const statusClass = computed(() => `settings-status-pill--${props.statusTone}`)
const trailingIcon = computed(() => (props.external ? 'open_in_new' : 'chevron_right'))
</script>
