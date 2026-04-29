<template>
  <q-page :class="['page-container', pageClass]" :data-testid="pageTestId">
    <canvas
      v-if="showConfetti"
      ref="confettiCanvas"
      class="confetti-canvas"
      data-testid="success-confetti-canvas"
    />

    <div class="content-container">
      <q-btn
        flat
        round
        color="white"
        icon="close"
        class="success-close-btn"
        :to="closeTo"
        :data-testid="closeTestId"
        @click="emit('close')"
      />

      <div class="success-shell" :data-testid="successTestId">
        <div class="success-icon">
          <q-icon :name="icon" size="3.5em" :color="iconColor" />
        </div>

        <div class="success-title" :data-testid="titleTestId">{{ title }}</div>
        <div class="success-amount" :data-testid="amountTestId">{{ amountText }}</div>
        <div v-if="subtitle" class="success-subtitle">{{ subtitle }}</div>

        <slot name="summary" />

        <slot name="actions">
          <q-btn
            color="primary"
            no-caps
            unelevated
            class="success-action-btn vipr-btn vipr-btn--primary vipr-btn--lg"
            :to="homeTo"
            :label="homeLabel"
            :data-testid="homeTestId"
          />
        </slot>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { useConfettiCelebration } from 'src/composables/useConfettiCelebration'

defineOptions({
  name: 'SuccessResultLayout',
})

withDefaults(
  defineProps<{
    pageClass: string
    title: string
    amountText: string
    subtitle?: string
    icon?: string
    iconColor?: string
    showConfetti?: boolean
    closeTo?: RouteLocationRaw | undefined
    homeTo?: RouteLocationRaw
    homeLabel?: string
    pageTestId?: string | undefined
    successTestId?: string | undefined
    closeTestId?: string | undefined
    titleTestId?: string | undefined
    amountTestId?: string | undefined
    homeTestId?: string | undefined
  }>(),
  {
    subtitle: '',
    icon: 'check_circle',
    iconColor: 'positive',
    showConfetti: false,
    closeTo: undefined,
    homeTo: () => ({ name: '/' }),
    homeLabel: 'Back to home',
    pageTestId: undefined,
    successTestId: undefined,
    closeTestId: undefined,
    titleTestId: undefined,
    amountTestId: undefined,
    homeTestId: undefined,
  },
)

const emit = defineEmits<{
  close: []
}>()

const confettiCanvas = ref<HTMLCanvasElement | null>(null)
useConfettiCelebration(confettiCanvas)
</script>
