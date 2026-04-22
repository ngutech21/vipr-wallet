<template>
  <div
    v-if="installInstruction != null"
    class="install-panel"
    data-testid="startup-wizard-install-panel"
  >
    <div class="install-panel__eyebrow">Recommended setup</div>

    <div class="install-panel__header">
      <div class="install-panel__icon">
        <q-icon name="home" size="24px" />
      </div>

      <div class="install-panel__copy">
        <div class="text-h4 text-weight-bold q-mb-sm">Add Vipr to your home screen</div>
        <div class="install-panel__description">
          {{ installHintDescription }}
        </div>
      </div>
    </div>

    <div v-if="needsNativeBrowser" class="install-panel__browser-note">
      Open this page in {{ recommendedBrowserLabel }} to install Vipr from the correct browser.
    </div>

    <div class="install-panel__steps-title">
      {{ installInstruction.title }}
    </div>

    <div v-for="(step, index) in installInstruction.steps" :key="step" class="install-step">
      <div class="install-step__index">{{ index + 1 }}</div>
      <div class="install-step__text">{{ step }}</div>
    </div>

    <div class="install-panel__footer text-caption">
      Once Vipr is on your home screen, reopen it from the new icon for the cleanest full-screen
      experience.
    </div>
  </div>

  <div class="row justify-end q-mt-lg">
    <q-btn
      label="Continue in Browser"
      unelevated
      no-caps
      class="install-panel__continue-btn"
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
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.76);
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
  background: rgba(255, 255, 255, 0.06);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.install-panel__copy {
  min-width: 0;
}

.install-panel__description {
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.74);
}

.install-panel__browser-note {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 179, 64, 0.08);
  border: 1px solid rgba(255, 179, 64, 0.18);
  color: #ffd18d;
  font-size: 0.92rem;
}

.install-panel__steps-title {
  font-weight: 700;
  color: white;
}

.install-step {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);

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
  color: white;
  font-size: 0.82rem;
  font-weight: 700;
}

.install-step__text {
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.92);
}

.install-panel__footer {
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.58);
}

.install-panel__continue-btn {
  min-height: 54px;
  padding-inline: 24px;
  border-radius: 18px;
  background: white !important;
  color: #111827 !important;
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.28);
}
</style>
