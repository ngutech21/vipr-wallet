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
  min-height: 92px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.04);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 18px 20px;
  border: 1px solid transparent;
}

.amount-display--label-less {
  gap: 0;
}

.amount-display--error {
  border-color: rgba(255, 82, 111, 0.55);
}

.amount-display__label {
  color: rgba(255, 255, 255, 0.58);
  font-size: 0.88rem;
  line-height: 1.2;
  text-align: center;
}

.amount-display__value {
  color: white;
  text-align: center;
  font-size: clamp(2rem, 6vw, 2.5rem);
  line-height: 1.05;
  font-weight: 700;
  letter-spacing: -0.02em;
  word-break: break-word;
}

.amount-display__error {
  margin-top: 8px;
  color: var(--q-negative);
  font-size: 0.78rem;
  text-align: center;
}
</style>
