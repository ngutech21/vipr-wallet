<template>
  <div class="row q-col-gutter-sm" data-testid="numeric-keypad">
    <div class="col-4" v-for="(button, index) in buttons" :key="`${button.testId}-${index}`">
      <q-btn
        outline
        color="white"
        class="full-width"
        :icon="button.icon"
        :label="button.label"
        @click="button.handler"
        :data-testid="button.testId"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { KeypadButton } from 'src/composables/useNumericInput'

defineProps<{
  buttons: KeypadButton[]
}>()
</script>
