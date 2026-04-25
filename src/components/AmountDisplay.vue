<template>
  <div class="amount-display-wrap">
    <div
      class="amount-display"
      :class="{
        'amount-display--error': errorMessage,
        'amount-display--label-less': !label,
      }"
      :data-testid="dataTestid"
    >
      <div v-if="label" class="amount-display__label">{{ label }}</div>
      <div class="amount-display__value">{{ value }}</div>
    </div>

    <div v-if="errorMessage" class="amount-display__error">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    value: string
    label?: string
    errorMessage?: string | null
    dataTestid?: string
  }>(),
  {
    label: 'Amount (sats)',
    errorMessage: null,
    dataTestid: '',
  },
)
</script>

<style scoped>
.amount-display-wrap {
  width: 100%;
}

.amount-display {
  min-height: 88px;
  border-radius: var(--vipr-radius-button-lg);
  background: var(--vipr-control-panel-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--vipr-space-2);
  padding: var(--vipr-space-4-5) var(--vipr-space-5);
  border: 1px solid var(--vipr-control-panel-border);
  box-shadow: var(--vipr-control-panel-shadow);
}

.amount-display--label-less {
  gap: 0;
}

.amount-display--error {
  border-color: var(--q-negative);
}

.amount-display__label {
  color: var(--vipr-text-soft);
  font-size: var(--vipr-font-size-caption);
  line-height: 1.2;
  text-align: center;
}

.amount-display__value {
  color: var(--vipr-text-primary);
  text-align: center;
  font-size: var(--vipr-font-size-control-amount);
  line-height: var(--vipr-line-height-tight);
  font-weight: 700;
  letter-spacing: 0;
  word-break: break-word;
}

.amount-display__error {
  margin-top: var(--vipr-space-2);
  color: var(--q-negative);
  font-size: var(--vipr-font-size-label);
  line-height: var(--vipr-line-height-body);
  text-align: center;
}
</style>
