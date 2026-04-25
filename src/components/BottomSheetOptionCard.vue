<template>
  <q-card
    class="bottom-sheet-option-card cursor-pointer"
    flat
    bordered
    :class="{ 'bottom-sheet-option-card--disabled': disabled }"
    v-ripple
    @click="onSelect"
  >
    <q-card-section class="bottom-sheet-option-card__content">
      <div class="bottom-sheet-option-card__icon">
        <q-icon :name="icon" :color="iconColor" size="48px" />
      </div>

      <div class="bottom-sheet-option-card__copy">
        <div class="bottom-sheet-option-card__title">{{ title }}</div>
        <div class="bottom-sheet-option-card__description">
          {{ description }}
        </div>
      </div>

      <q-icon name="chevron_right" color="grey-6" size="24px" />
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title: string
    description: string
    icon: string
    iconColor?: string
    disabled?: boolean
  }>(),
  {
    iconColor: 'primary',
    disabled: false,
  },
)

const emit = defineEmits<{
  select: []
}>()

function onSelect() {
  if (props.disabled) {
    return
  }

  emit('select')
}
</script>

<style scoped>
.bottom-sheet-option-card {
  border-radius: var(--vipr-radius-button-lg);
  border-color: var(--vipr-color-surface-border);
  background: var(--vipr-option-card-bg);
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease;
}

.bottom-sheet-option-card:hover {
  transform: translateY(-1px);
  border-color: var(--vipr-option-card-border-hover);
  background: var(--vipr-option-card-bg-hover);
}

.bottom-sheet-option-card--disabled {
  opacity: 0.55;
  pointer-events: none;
}

.bottom-sheet-option-card__content {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 24px;
  gap: var(--vipr-space-4);
  align-items: center;
  min-height: 112px;
  padding: var(--vipr-space-5);
}

.bottom-sheet-option-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
}

.bottom-sheet-option-card__copy {
  min-width: 0;
}

.bottom-sheet-option-card__title {
  color: var(--vipr-text-primary);
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.25;
}

.bottom-sheet-option-card__description {
  margin-top: var(--vipr-space-2);
  color: var(--vipr-text-soft);
  font-size: 0.9rem;
  line-height: 1.45;
}
</style>
