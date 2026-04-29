<template>
  <div class="amount-entry-group" :class="{ 'amount-entry-group--without-meta': !hasMetaRow }">
    <AmountDisplay
      :value="value"
      :label="label"
      :error-message="errorMessage"
      :show-error-text="false"
      :data-testid="amountTestId"
      :class="amountClass"
    />

    <div
      v-if="hasMetaRow"
      class="amount-entry-group__meta"
      :class="{
        'amount-entry-group__meta--error': errorMessage != null && errorMessage !== '',
        'amount-entry-group__meta--empty': activeMetaText === '',
      }"
      :data-testid="metaTestId"
      :aria-hidden="activeMetaText === ''"
    >
      {{ activeMetaText }}
    </div>

    <NumericKeypad :buttons="buttons" class="amount-entry-group__keypad" />

    <div v-if="$slots.default" class="amount-entry-group__after">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue'
import AmountDisplay from 'src/components/AmountDisplay.vue'
import NumericKeypad from 'src/components/NumericKeypad.vue'
import type { KeypadButton } from 'src/composables/useNumericInput'

defineOptions({
  name: 'AmountEntryGroup',
})

type ClassValue = HTMLAttributes['class']

const props = withDefaults(
  defineProps<{
    value: string
    buttons: KeypadButton[]
    label?: string
    errorMessage?: string | null
    metaText?: string
    amountTestId?: string
    metaTestId?: string
    amountClass?: ClassValue | undefined
    reserveMetaSpace?: boolean
  }>(),
  {
    label: 'Amount (sats)',
    errorMessage: null,
    metaText: '',
    amountTestId: '',
    metaTestId: '',
    amountClass: undefined,
    reserveMetaSpace: true,
  },
)

const activeMetaText = computed(() => {
  if (props.errorMessage != null && props.errorMessage !== '') {
    return props.errorMessage
  }

  return props.metaText
})

const hasMetaRow = computed(() => props.reserveMetaSpace || activeMetaText.value !== '')
</script>

<style scoped>
.amount-entry-group {
  width: 100%;
}

.amount-entry-group__meta {
  min-height: calc(var(--vipr-font-size-caption) * var(--vipr-line-height-body));
  margin-top: var(--vipr-space-2);
  margin-bottom: var(--vipr-space-2);
  color: var(--vipr-text-soft);
  font-size: var(--vipr-font-size-caption);
  line-height: var(--vipr-line-height-body);
  text-align: center;
}

.amount-entry-group__meta--error {
  color: var(--q-negative);
}

.amount-entry-group__meta--empty {
  visibility: hidden;
}

.amount-entry-group--without-meta .amount-entry-group__keypad {
  margin-top: var(--vipr-space-4);
}

.amount-entry-group__after {
  margin-top: var(--vipr-space-4);
}
</style>
