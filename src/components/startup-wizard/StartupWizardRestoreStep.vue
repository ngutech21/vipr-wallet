<template>
  <div class="restore-step__intro vipr-caption">
    Enter your 12-word recovery phrase in order to restore your wallet.
  </div>

  <div class="restore-grid">
    <q-input
      v-for="(_, index) in localRestoreWords"
      :key="index"
      :model-value="localRestoreWords[index]"
      :label="`${index + 1}`"
      filled
      dark
      dense
      class="vipr-input"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      :disable="isRestoring"
      :data-testid="`startup-wizard-restore-word-${index + 1}`"
      @update:model-value="updateWord(index, $event)"
    />
  </div>

  <div class="restore-step__actions">
    <div class="restore-step__action">
      <q-btn
        label="Back"
        flat
        no-caps
        class="restore-step__button vipr-btn vipr-btn--secondary vipr-btn--lg"
        :disable="isRestoring"
        data-testid="startup-wizard-restore-back-btn"
        @click="$emit('back')"
      />
    </div>
    <div class="restore-step__action">
      <q-btn
        label="Restore wallet"
        color="primary"
        no-caps
        class="restore-step__button vipr-btn vipr-btn--primary-soft vipr-btn--lg"
        :loading="isRestoring"
        :disable="isCreating || isRestoring"
        data-testid="startup-wizard-restore-submit-btn"
        @click="$emit('submit')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  isCreating: boolean
  isRestoring: boolean
  restoreWords: string[]
}>()

const emit = defineEmits<{
  back: []
  submit: []
  'update:restoreWords': [value: string[]]
}>()

const localRestoreWords = ref<string[]>([...props.restoreWords])

watch(
  () => props.restoreWords,
  (nextWords) => {
    localRestoreWords.value = [...nextWords]
  },
  { deep: true },
)

function updateWord(index: number, value: string | number | null) {
  const nextWords = [...localRestoreWords.value]
  nextWords[index] = value == null ? '' : String(value)
  localRestoreWords.value = nextWords
  emit('update:restoreWords', nextWords)
}
</script>

<style scoped>
.restore-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--vipr-space-2);
  margin-bottom: var(--vipr-space-4);
}

.restore-step__intro {
  margin-bottom: var(--vipr-space-4);
}

.restore-step__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--vipr-space-2);
}

.restore-step__button {
  width: 100%;
}

@media (max-width: 599px) {
  .restore-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .restore-step__actions {
    grid-template-columns: 1fr;
  }
}
</style>
