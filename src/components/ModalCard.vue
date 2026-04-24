<template>
  <q-card class="modal-card" flat>
    <div
      v-touch-swipe.down.mouse="onDismissSwipe"
      class="modal-card__swipe-zone"
      data-testid="modal-card-swipe-zone"
    >
      <div class="modal-card__handle" aria-hidden="true"></div>

      <q-card-section class="modal-card__header">
        <div class="modal-card__header-action">
          <q-btn
            v-if="showBack"
            icon="arrow_back"
            color="grey-4"
            flat
            round
            dense
            class="modal-card__icon-btn"
            data-testid="modal-card-back-btn"
            @click="emit('back')"
          />
        </div>

        <div class="modal-card__title text-center">
          {{ title }}
        </div>

        <div class="modal-card__header-action modal-card__header-action--end">
          <q-btn
            v-if="showClose"
            icon="close"
            color="grey-4"
            flat
            round
            dense
            class="modal-card__icon-btn"
            v-close-popup
            data-testid="modal-card-close-btn"
            @click="emit('close')"
          />
        </div>
      </q-card-section>
    </div>

    <q-separator class="modal-card__separator" />

    <div class="modal-card__body" :class="bodyClass" @touchstart.stop @mousedown.stop>
      <slot></slot>
    </div>

    <template v-if="hasFooter">
      <q-separator class="modal-card__separator" />
      <q-card-actions class="modal-card__footer" :class="footerClass">
        <slot name="footer"></slot>
      </q-card-actions>
    </template>
  </q-card>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'

const props = withDefaults(
  defineProps<{
    title: string
    showBack?: boolean
    showClose?: boolean
    bodyClass?: string
    footerClass?: string
  }>(),
  {
    showBack: false,
    showClose: true,
    bodyClass: '',
    footerClass: '',
  },
)

const emit = defineEmits<{
  back: []
  close: []
}>()

const slots = useSlots()
const hasFooter = computed(() => slots.footer != null)
const bodyClass = computed(() => props.bodyClass)
const footerClass = computed(() => props.footerClass)

function onDismissSwipe() {
  emit('close')
}
</script>

<style scoped>
.modal-card {
  width: min(100vw, 700px) !important;
  max-width: min(100vw, 700px) !important;
  max-height: 92vh;
  margin: 0 auto !important;
  border-radius: 24px 24px 0 0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01)), #1f1f1f;
  color: white;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.45);
}

:global(.q-dialog__inner--bottom:not(.q-dialog__inner--maximized) > .modal-card) {
  width: min(100vw, 700px) !important;
  max-width: min(100vw, 700px) !important;
  margin-left: auto !important;
  margin-right: auto !important;
}

.modal-card__handle {
  width: 56px;
  height: 5px;
  margin: 12px auto 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.28);
  flex: 0 0 auto;
}

.modal-card__swipe-zone {
  flex: 0 0 auto;
}

.modal-card__header {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 40px;
  align-items: center;
  gap: 12px;
  padding: 8px 20px 18px;
  flex: 0 0 auto;
}

.modal-card__header-action {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-height: 40px;
}

.modal-card__header-action--end {
  justify-content: flex-end;
}

.modal-card__icon-btn {
  width: 40px;
  height: 40px;
}

.modal-card__title {
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0.01em;
}

.modal-card__separator {
  opacity: 0.28;
}

.modal-card__body {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.modal-card__footer {
  padding: 16px 20px calc(20px + env(safe-area-inset-bottom));
  gap: 12px;
  justify-content: flex-end;
  flex-wrap: nowrap;
}
</style>
