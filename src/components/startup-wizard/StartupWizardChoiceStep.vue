<template>
  <div class="text-body1 q-mb-md">
    Choose how you want to continue with your wallet on this device
  </div>

  <div class="column q-gutter-y-sm q-mb-sm">
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

  <div v-if="isCreateLocked" class="text-caption text-warning q-mt-md">
    Wallet was already created in this setup. Continue backup to proceed.
  </div>

  <div class="row justify-end q-mt-lg">
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
import type { SelectableFlow } from 'src/composables/useStartupWizard'

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
