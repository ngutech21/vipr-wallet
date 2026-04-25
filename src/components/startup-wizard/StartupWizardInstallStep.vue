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
  gap: var(--vipr-wizard-install-gap);
}

.install-panel__eyebrow {
  display: inline-flex;
  align-items: center;
  padding: var(--vipr-space-1) 10px;
  border-radius: var(--vipr-radius-pill);
  background: var(--vipr-wizard-install-eyebrow-bg);
  border: 1px solid var(--vipr-wizard-install-eyebrow-border);
}

.install-panel__header {
  display: flex;
  gap: var(--vipr-row-padding-y);
  align-items: flex-start;
}

.install-panel__icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  border-radius: var(--vipr-radius-control);
  background: var(--vipr-row-icon-bg);
  color: var(--vipr-text-primary);
  border: 1px solid var(--vipr-color-surface-border);
}

.install-panel__copy {
  min-width: 0;
}

.install-panel__browser-note {
  padding: var(--vipr-wizard-install-warning-padding);
  border-radius: var(--vipr-radius-sm);
  font-size: var(--vipr-font-size-caption);
}

.install-step {
  display: flex;
  gap: var(--vipr-space-3);
  align-items: flex-start;
  padding-top: var(--vipr-row-padding-y);
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
  border-radius: var(--vipr-radius-pill);
  background: var(--vipr-wizard-install-step-bg);
  border: 1px solid var(--vipr-wizard-install-step-border);
  color: var(--vipr-text-primary);
  font-size: var(--vipr-font-size-label);
  font-weight: 700;
}

.install-step__text {
  line-height: var(--vipr-line-height-body);
  color: var(--vipr-text-primary);
}

.install-panel__actions {
  display: flex;
}

.install-panel__continue-btn {
  width: 100%;
  padding-inline: var(--vipr-space-6);
}
</style>
