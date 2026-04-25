<template>
  <div class="choice-step__intro">
    Choose how you want to continue with your wallet on this device
  </div>

  <div class="choice-step__options">
    <q-radio
      :model-value="selectedFlow"
      val="create"
      label="Create New Wallet"
      :disable="isCreating || isRestoring"
      data-testid="startup-wizard-create-radio"
      @update:model-value="$emit('update:selectedFlow', $event)"
    />
    <q-radio
      :model-value="selectedFlow"
      val="restore"
      label="Restore From Backup"
      :disable="isCreating || isRestoring || isCreateLocked"
      data-testid="startup-wizard-restore-radio"
      @update:model-value="$emit('update:selectedFlow', $event)"
    />
  </div>

  <div v-if="isCreateLocked" class="choice-step__warning">
    Wallet was already created in this setup. Continue backup to proceed.
  </div>

  <div class="choice-step__actions">
    <q-btn
      label="Next"
      color="primary"
      :loading="isCreating"
      :disable="!canProceedFromChoice"
      data-testid="startup-wizard-choice-next-btn"
      @click="$emit('next')"
    />
  </div>
</template>

<script setup lang="ts">
type SelectableFlow = 'create' | 'restore'

defineProps<{
  canProceedFromChoice: boolean
  isCreating: boolean
  isCreateLocked: boolean
  isRestoring: boolean
  selectedFlow: SelectableFlow | null
}>()

defineEmits<{
  next: []
  'update:selectedFlow': [value: SelectableFlow]
}>()
</script>

<style scoped>
.choice-step__intro {
  margin-bottom: var(--vipr-space-4);
  font-size: var(--vipr-font-size-body);
  line-height: var(--vipr-line-height-body);
}

.choice-step__options {
  display: flex;
  flex-direction: column;
  gap: var(--vipr-space-2);
  margin-bottom: var(--vipr-space-2);
}

.choice-step__warning {
  margin-top: var(--vipr-space-4);
  color: var(--vipr-warning-text);
  font-size: var(--vipr-font-size-caption);
  line-height: var(--vipr-line-height-body);
}

.choice-step__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--vipr-space-6);
}
</style>
