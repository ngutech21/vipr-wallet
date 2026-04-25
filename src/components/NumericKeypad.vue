<template>
  <div class="numeric-keypad" data-testid="numeric-keypad">
    <div
      class="numeric-keypad__cell"
      v-for="(button, index) in buttons"
      :key="`${button.testId}-${index}`"
    >
      <q-btn
        unelevated
        :ripple="false"
        class="keypad-btn"
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
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--vipr-space-2);
}

.numeric-keypad__cell {
  min-width: 0;
}

.keypad-btn {
  width: 100%;
  min-height: 56px;
  border-radius: var(--vipr-radius-control);
  background: var(--vipr-control-panel-bg);
  border: 1px solid var(--vipr-row-border);
  color: var(--vipr-text-primary);
  font-size: var(--vipr-font-size-keypad);
  font-weight: 600;
  box-shadow: var(--vipr-control-panel-shadow);
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    color 160ms ease;
}

.keypad-btn:hover {
  background: var(--vipr-control-panel-bg-hover);
  border-color: var(--vipr-color-input-border-hover);
}

.keypad-btn:active {
  background: var(--vipr-control-panel-bg-active);
  border-color: var(--vipr-color-input-border-focus);
}

.keypad-btn--clear,
.keypad-btn--backspace {
  color: var(--vipr-text-secondary);
}

.keypad-btn :deep(.q-icon) {
  font-size: var(--vipr-font-size-icon-lg);
}

.keypad-btn :deep(.q-focus-helper),
.keypad-btn :deep(.q-ripple) {
  display: none;
}

@media (max-width: 520px) {
  .keypad-btn {
    min-height: 52px;
    border-radius: var(--vipr-radius-sm);
    font-size: var(--vipr-font-size-section-title);
  }
}
</style>
