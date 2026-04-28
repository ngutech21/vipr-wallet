<template>
  <div class="app-lock-pin-entry" :data-testid="dataTestid">
    <div class="app-lock-pin-entry__header">
      <q-icon v-if="icon" :name="icon" class="app-lock-pin-entry__icon" />
      <div class="app-lock-pin-entry__title">{{ currentTitle }}</div>
      <div v-if="currentSubtitle" class="app-lock-pin-entry__subtitle">
        {{ currentSubtitle }}
      </div>
    </div>

    <div class="app-lock-pin-entry__dots" aria-hidden="true">
      <span
        v-for="index in 6"
        :key="index"
        class="app-lock-pin-entry__dot"
        :class="{ 'app-lock-pin-entry__dot--filled': index <= pin.length }"
      />
    </div>

    <div v-if="errorText" class="app-lock-pin-entry__error" data-testid="app-lock-pin-error">
      {{ errorText }}
    </div>

    <NumericKeypad :buttons="keypadButtons" class="app-lock-pin-entry__keypad" />

    <q-btn
      :label="currentSubmitLabel"
      color="primary"
      no-caps
      unelevated
      class="vipr-btn vipr-btn--primary vipr-btn--lg app-lock-pin-entry__submit"
      :disable="pin.length < 4 || submitting"
      :loading="submitting"
      @click="submitPin"
      data-testid="app-lock-pin-submit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

import NumericKeypad from 'src/components/NumericKeypad.vue'
import type { KeypadButton } from 'src/composables/useNumericInput'

const props = withDefaults(
  defineProps<{
    mode: 'setup' | 'verify'
    title?: string
    subtitle?: string
    confirmTitle?: string
    confirmSubtitle?: string
    submitLabel?: string
    confirmSubmitLabel?: string
    icon?: string
    dataTestid?: string
    onSubmit: (pin: string) => boolean | Promise<boolean>
  }>(),
  {
    confirmTitle: 'Confirm PIN',
    confirmSubtitle: 'Enter the same PIN again.',
    submitLabel: 'Continue',
    confirmSubmitLabel: 'Confirm',
    icon: '',
    title: '',
    subtitle: '',
    dataTestid: 'app-lock-pin-entry',
  },
)

const emit = defineEmits<{
  success: []
}>()

const pin = ref('')
const firstPin = ref<string | null>(null)
const confirming = ref(false)
const submitting = ref(false)
const errorText = ref('')

const currentTitle = computed(() => {
  if (confirming.value) {
    return props.confirmTitle
  }

  return props.title !== '' ? props.title : props.mode === 'setup' ? 'Set PIN' : 'Enter PIN'
})

const currentSubtitle = computed(() => {
  if (confirming.value) {
    return props.confirmSubtitle
  }

  return props.subtitle
})

const currentSubmitLabel = computed(() => {
  return confirming.value || props.mode === 'verify' ? props.confirmSubmitLabel : props.submitLabel
})

function appendDigit(digit: number): void {
  if (pin.value.length >= 6 || submitting.value) {
    return
  }

  pin.value += String(digit)
  errorText.value = ''
}

function deleteLastDigit(): void {
  if (submitting.value) {
    return
  }

  pin.value = pin.value.slice(0, -1)
  errorText.value = ''
}

function clearPin(): void {
  if (submitting.value) {
    return
  }

  pin.value = ''
  errorText.value = ''
}

const keypadButtons = computed<KeypadButton[]>(() => [
  { testId: 'app-lock-keypad-btn-1', label: '1', handler: () => appendDigit(1) },
  { testId: 'app-lock-keypad-btn-2', label: '2', handler: () => appendDigit(2) },
  { testId: 'app-lock-keypad-btn-3', label: '3', handler: () => appendDigit(3) },
  { testId: 'app-lock-keypad-btn-4', label: '4', handler: () => appendDigit(4) },
  { testId: 'app-lock-keypad-btn-5', label: '5', handler: () => appendDigit(5) },
  { testId: 'app-lock-keypad-btn-6', label: '6', handler: () => appendDigit(6) },
  { testId: 'app-lock-keypad-btn-7', label: '7', handler: () => appendDigit(7) },
  { testId: 'app-lock-keypad-btn-8', label: '8', handler: () => appendDigit(8) },
  { testId: 'app-lock-keypad-btn-9', label: '9', handler: () => appendDigit(9) },
  { testId: 'app-lock-keypad-btn-clear', icon: 'clear', handler: clearPin },
  { testId: 'app-lock-keypad-btn-0', label: '0', handler: () => appendDigit(0) },
  { testId: 'app-lock-keypad-btn-backspace', icon: 'backspace', handler: deleteLastDigit },
])

function resetSetup(): void {
  pin.value = ''
  firstPin.value = null
  confirming.value = false
}

async function submitPin(): Promise<void> {
  if (pin.value.length < 4 || submitting.value) {
    return
  }

  if (props.mode === 'setup' && !confirming.value) {
    firstPin.value = pin.value
    pin.value = ''
    confirming.value = true
    errorText.value = ''
    return
  }

  if (props.mode === 'setup' && pin.value !== firstPin.value) {
    resetSetup()
    errorText.value = 'PINs do not match. Try again.'
    return
  }

  const submittedPin = pin.value
  submitting.value = true
  const ok = await props.onSubmit(submittedPin)
  finishSubmission(ok)
}

function finishSubmission(ok: boolean): void {
  submitting.value = false

  if (!ok) {
    pin.value = ''
    errorText.value = props.mode === 'setup' ? 'Unable to save PIN.' : 'Incorrect PIN.'
    return
  }

  pin.value = ''
  emit('success')
}
</script>

<style scoped>
.app-lock-pin-entry {
  width: 100%;
}

.app-lock-pin-entry__header {
  text-align: center;
}

.app-lock-pin-entry__icon {
  display: inline-flex;
  width: 48px;
  height: 48px;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--vipr-space-3);
  border-radius: var(--vipr-radius-round);
  background: var(--vipr-row-icon-bg);
  color: var(--vipr-text-primary);
  font-size: var(--vipr-font-size-icon-lg);
}

.app-lock-pin-entry__title {
  color: var(--vipr-text-primary);
  font-size: var(--vipr-font-size-title);
  font-weight: 700;
  line-height: 1.2;
}

.app-lock-pin-entry__subtitle {
  margin-top: var(--vipr-space-2);
  color: var(--vipr-text-secondary);
  font-size: var(--vipr-font-size-body);
  line-height: 1.45;
}

.app-lock-pin-entry__dots {
  display: flex;
  justify-content: center;
  gap: var(--vipr-space-3);
  margin-top: var(--vipr-space-6);
}

.app-lock-pin-entry__dot {
  width: 14px;
  height: 14px;
  border: 2px solid var(--vipr-row-border);
  border-radius: var(--vipr-radius-round);
  background: transparent;
}

.app-lock-pin-entry__dot--filled {
  border-color: var(--q-primary);
  background: var(--q-primary);
}

.app-lock-pin-entry__error {
  min-height: 22px;
  margin-top: var(--vipr-space-4);
  color: var(--q-negative);
  font-size: var(--vipr-font-size-caption);
  text-align: center;
}

.app-lock-pin-entry__keypad {
  margin-top: var(--vipr-space-5);
}

.app-lock-pin-entry__submit {
  width: 100%;
  margin-top: var(--vipr-space-5);
}
</style>
