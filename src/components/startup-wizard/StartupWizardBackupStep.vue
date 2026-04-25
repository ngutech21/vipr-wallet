<template>
  <div class="backup-step__intro vipr-caption">
    Write down these 12 words in order. They are your recovery phrase and the only way to recover
    your wallet.
  </div>

  <div class="words-grid vipr-word-grid backup-step__words">
    <q-card
      v-for="(word, index) in mnemonicWords"
      :key="index"
      flat
      bordered
      class="vipr-word-card"
    >
      <q-card-section class="vipr-word-card__section">
        <div class="vipr-word-card__number">{{ index + 1 }}</div>
        <div class="vipr-word-card__text">{{ word }}</div>
      </q-card-section>
    </q-card>
  </div>

  <div class="backup-step__actions">
    <div class="backup-step__action">
      <q-btn
        label="Back"
        flat
        no-caps
        class="backup-step__button vipr-btn vipr-btn--secondary vipr-btn--lg"
        data-testid="startup-wizard-backup-back-btn"
        @click="$emit('back')"
      />
    </div>
    <div class="backup-step__action">
      <q-btn
        label="Recovery phrase saved"
        color="primary"
        icon="check_circle"
        no-caps
        class="backup-step__button backup-confirm-btn vipr-btn vipr-btn--primary-soft vipr-btn--lg"
        :disable="mnemonicWords.length !== 12"
        data-testid="startup-wizard-backup-confirm-btn"
        @click="$emit('confirm')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  mnemonicWords: string[]
}>()

defineEmits<{
  back: []
  confirm: []
}>()
</script>

<style scoped>
.backup-step__intro,
.backup-step__words {
  margin-bottom: var(--vipr-space-4);
}

.backup-step__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--vipr-space-2);
}

.backup-step__button {
  width: 100%;
}

@media (max-width: 599px) {
  .backup-step__actions {
    grid-template-columns: 1fr;
  }
}

.backup-confirm-btn :deep(.q-btn__content) {
  flex-wrap: nowrap;
  gap: var(--vipr-space-2);
}

.backup-confirm-btn :deep(.block) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
