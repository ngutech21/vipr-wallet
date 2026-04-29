<template>
  <div :class="topbarClasses">
    <q-btn
      flat
      round
      :color="buttonColor"
      icon="arrow_back"
      :aria-label="ariaLabel"
      :to="backTo"
      :class="buttonClasses"
      :data-testid="buttonTestId"
      @click="emit('back')"
    />

    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

defineOptions({
  name: 'ViprTopbar',
})

type ClassValue = HTMLAttributes['class']

const props = withDefaults(
  defineProps<{
    backTo?: RouteLocationRaw | undefined
    buttonTestId?: string | undefined
    topbarClass?: ClassValue | undefined
    buttonClass?: ClassValue | undefined
    buttonColor?: string | undefined
    ariaLabel?: string
    comfortable?: boolean
    bleed?: boolean
  }>(),
  {
    backTo: undefined,
    buttonTestId: undefined,
    topbarClass: undefined,
    buttonClass: undefined,
    buttonColor: undefined,
    ariaLabel: 'Go back',
    comfortable: false,
    bleed: false,
  },
)

const emit = defineEmits<{
  back: []
}>()

const topbarClasses = computed(() => [
  'vipr-topbar',
  props.comfortable ? 'vipr-topbar--comfortable' : null,
  props.topbarClass,
])

const buttonClasses = computed(() => [
  'vipr-topbar__back',
  props.bleed ? 'vipr-topbar__back--bleed' : null,
  props.buttonClass,
])
</script>
