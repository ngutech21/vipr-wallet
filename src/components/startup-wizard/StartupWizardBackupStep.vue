<template>
  <div class="vipr-caption q-mb-md">
    Write down these 12 words in order. They are your recovery phrase and the only way to recover
    your wallet.
  </div>

  <div class="words-grid vipr-word-grid q-mb-md">
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

  <div class="row q-col-gutter-sm">
    <div class="col-12 col-sm-6">
      <q-btn
        label="Back"
        flat
        no-caps
        class="full-width vipr-btn vipr-btn--secondary vipr-btn--lg"
        data-testid="startup-wizard-backup-back-btn"
        @click="$emit('back')"
      />
    </div>
    <div class="col-12 col-sm-6">
      <q-btn
        label="Recovery phrase saved"
        color="primary"
        icon="check_circle"
        no-caps
        class="full-width backup-confirm-btn vipr-btn vipr-btn--primary-soft vipr-btn--lg"
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
.full-width {
  width: 100%;
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
