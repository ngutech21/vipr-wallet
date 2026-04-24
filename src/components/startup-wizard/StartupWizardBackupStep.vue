<template>
  <div class="text-body2 q-mb-md">
    Write down these 12 words in order. They are your recovery phrase and the only way to recover
    your wallet.
  </div>

  <div class="words-grid q-mb-md">
    <q-card v-for="(word, index) in mnemonicWords" :key="index" flat bordered>
      <q-card-section class="q-pa-sm">
        <div class="text-caption text-grey-7">{{ index + 1 }}</div>
        <div class="text-subtitle2 text-weight-medium word-text">{{ word }}</div>
      </q-card-section>
    </q-card>
  </div>

  <div class="row q-col-gutter-sm">
    <div class="col-12 col-sm-6">
      <q-btn
        label="Back"
        flat
        no-caps
        color="grey-7"
        class="full-width"
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
        class="full-width backup-confirm-btn"
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
.words-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.word-text {
  font-family: 'Courier New', monospace;
}

.full-width {
  width: 100%;
}

.backup-confirm-btn :deep(.q-btn__content) {
  flex-wrap: nowrap;
  gap: 8px;
}

.backup-confirm-btn :deep(.block) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 599px) {
  .words-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
