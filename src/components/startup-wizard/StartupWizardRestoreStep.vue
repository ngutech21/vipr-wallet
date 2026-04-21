<template>
  <div class="text-body2 q-mb-md">
    Enter your 12-word recovery phrase in order to restore your wallet.
  </div>

  <div class="restore-grid q-mb-md">
    <q-input
      v-for="(_, index) in localRestoreWords"
      :key="index"
      :model-value="localRestoreWords[index]"
      :label="`${index + 1}`"
      outlined
      dense
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      :disable="isRestoring"
      :data-testid="`startup-wizard-restore-word-${index + 1}`"
      @update:model-value="updateWord(index, $event)"
    />
  </div>

  <div class="row q-col-gutter-sm">
    <div class="col-12 col-sm-6">
      <q-btn
        label="Back"
        flat
        color="grey-7"
        class="full-width"
        :disable="isRestoring"
        data-testid="startup-wizard-restore-back-btn"
        @click="$emit('back')"
      />
    </div>
    <div class="col-12 col-sm-6">
      <q-btn
        label="Restore wallet"
        color="primary"
        class="full-width"
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
  gap: 8px;
}

.full-width {
  width: 100%;
}

@media (max-width: 599px) {
  .restore-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
