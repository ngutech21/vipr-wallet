<template>
  <div class="numeric-keypad row q-col-gutter-sm" data-testid="numeric-keypad">
    <div class="col-4" v-for="(button, index) in buttons" :key="`${button.testId}-${index}`">
      <q-btn
        unelevated
        :ripple="false"
        class="keypad-btn full-width"
        :class="{
          'keypad-btn--clear': button.icon === 'clear',
          'keypad-btn--backspace': button.icon === 'backspace',
        }"
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

<style scoped>
.numeric-keypad {
  width: 100%;
}

.keypad-btn {
  min-height: 56px;
  border-radius: var(--vipr-radius-control);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.028), rgba(255, 255, 255, 0.016)),
    rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.075);
  color: rgba(255, 255, 255, 0.92);
  font-size: 1.16rem;
  font-weight: 600;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    color 160ms ease;
}

.keypad-btn:hover {
  background-color: rgba(255, 255, 255, 0.065);
  border-color: rgba(255, 255, 255, 0.1);
}

.keypad-btn:active {
  background-color: rgba(255, 255, 255, 0.09);
  border-color: rgba(255, 255, 255, 0.13);
}

.keypad-btn--clear,
.keypad-btn--backspace {
  color: rgba(255, 255, 255, 0.84);
}

.keypad-btn :deep(.q-icon) {
  font-size: 1.55rem;
}

.keypad-btn :deep(.q-focus-helper),
.keypad-btn :deep(.q-ripple) {
  display: none;
}

@media (max-width: 520px) {
  .keypad-btn {
    min-height: 52px;
    border-radius: var(--vipr-radius-sm);
    font-size: 1.08rem;
  }
}
</style>
