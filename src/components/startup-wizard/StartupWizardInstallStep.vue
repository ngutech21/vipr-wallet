<template>
  <div
    v-if="installInstruction != null"
    class="install-panel"
    data-testid="startup-wizard-install-panel"
  >
    <div class="install-panel__eyebrow vipr-eyebrow">Recommended setup</div>

    <div class="install-panel__header">
      <div class="install-panel__icon">
        <q-icon name="home" size="24px" />
      </div>

      <div class="install-panel__copy">
        <div class="install-panel__title vipr-title q-mb-sm">Add Vipr to your home screen</div>
        <div class="install-panel__description vipr-caption">
          {{ installHintDescription }}
        </div>
      </div>
    </div>

    <div v-if="needsNativeBrowser" class="install-panel__browser-note vipr-warning-card">
      Open this page in {{ recommendedBrowserLabel }} to install Vipr from the correct browser.
    </div>

    <div class="install-panel__steps-title vipr-section-title">
      {{ installInstruction.title }}
    </div>

    <div v-for="(step, index) in installInstruction.steps" :key="step" class="install-step">
      <div class="install-step__index">{{ index + 1 }}</div>
      <div class="install-step__text">{{ step }}</div>
    </div>

    <div class="install-panel__footer vipr-caption">
      Once Vipr is on your home screen, reopen it from the new icon for the cleanest full-screen
      experience.
    </div>
  </div>

  <div class="install-panel__actions q-mt-lg">
    <q-btn
      label="Continue in Browser"
      unelevated
      no-caps
      class="install-panel__continue-btn vipr-btn vipr-btn--primary-soft vipr-btn--lg"
      data-testid="startup-wizard-install-next-btn"
      @click="$emit('continue')"
    />
  </div>
</template>

<script setup lang="ts">
import type { InstallInstruction } from 'src/composables/useInstallHint'

defineProps<{
  installHintDescription: string
  installInstruction: InstallInstruction
  needsNativeBrowser: boolean
  recommendedBrowserLabel: string
}>()

defineEmits<{
  continue: []
}>()
</script>

<style scoped>
.install-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.install-panel__eyebrow {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(var(--q-primary-rgb), 0.16);
  border: 1px solid rgba(var(--q-primary-rgb), 0.28);
}

.install-panel__header {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.install-panel__icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  border-radius: 14px;
  background: var(--vipr-row-icon-bg);
  color: var(--vipr-text-primary);
  border: 1px solid var(--vipr-color-surface-border);
}

.install-panel__copy {
  min-width: 0;
}

.install-panel__browser-note {
  padding: 10px 12px;
  border-radius: var(--vipr-radius-sm);
  font-size: 0.92rem;
}

.install-step {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding-top: 14px;
  border-top: 1px solid var(--vipr-color-surface-border);

  + .install-step {
    margin-top: 2px;
  }
}

.install-step__index {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border-radius: 999px;
  background: rgba(var(--q-primary-rgb), 0.18);
  border: 1px solid rgba(var(--q-primary-rgb), 0.32);
  color: var(--vipr-text-primary);
  font-size: 0.82rem;
  font-weight: 700;
}

.install-step__text {
  line-height: 1.45;
  color: var(--vipr-text-primary);
}

.install-panel__actions {
  display: flex;
}

.install-panel__continue-btn {
  width: 100%;
  padding-inline: 24px;
}
</style>
