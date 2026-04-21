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
        <div class="text-h6 text-weight-medium q-mt-sm">{{ title }}</div>
        <div class="text-caption text-grey-7 q-mt-xs">
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
  border-radius: 18px;
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease;
}

.bottom-sheet-option-card:hover {
  transform: translateY(-1px);
  border-color: rgba(156, 39, 176, 0.5);
  background: rgba(255, 255, 255, 0.06);
}

.bottom-sheet-option-card--disabled {
  opacity: 0.55;
  pointer-events: none;
}

.bottom-sheet-option-card__content {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 24px;
  gap: 16px;
  align-items: center;
  padding: 20px;
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
</style>
