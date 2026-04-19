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

      <div>
        <div class="text-h6 q-mb-xs">Add Vipr to your home screen</div>
        <div class="text-body2 text-grey-5">
          {{ installHintDescription }}
        </div>
      </div>
    </div>

    <div v-if="needsNativeBrowser" class="install-panel__browser-note">
      Open this page in {{ recommendedBrowserLabel }} to install Vipr from the correct browser.
    </div>

    <div class="install-steps-card">
      <div class="install-steps-card__title">
        {{ installInstruction.title }}
      </div>

      <div v-for="(step, index) in installInstruction.steps" :key="step" class="install-step">
        <div class="install-step__index">{{ index + 1 }}</div>
        <div class="install-step__text">{{ step }}</div>
      </div>
    </div>

    <div class="install-panel__footer text-caption text-grey-6">
      Once Vipr is on your home screen, reopen it from the new icon for the cleanest full-screen
      experience.
    </div>
  </div>

  <div class="row justify-end q-mt-lg">
    <q-btn
      label="Continue in Browser"
      color="primary"
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
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  padding: 18px;
  background: linear-gradient(
    180deg,
    rgba(var(--q-primary-rgb), 0.12),
    rgba(255, 255, 255, 0.03) 42%,
    rgba(255, 255, 255, 0.02)
  );
  border: 1px solid rgba(var(--q-primary-rgb), 0.35);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.22);
}

.install-panel__eyebrow {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  margin-bottom: 14px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #f6ebff;
  background: rgba(var(--q-primary-rgb), 0.22);
}

.install-panel__header {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 14px;
}

.install-panel__icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(var(--q-primary-rgb), 0.28), rgba(0, 0, 0, 0.08));
  color: white;
  border: 1px solid rgba(var(--q-primary-rgb), 0.28);
}

.install-panel__browser-note {
  margin-bottom: 14px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 179, 64, 0.1);
  border: 1px solid rgba(255, 179, 64, 0.24);
  color: #ffd18d;
  font-size: 0.92rem;
}

.install-steps-card {
  padding: 14px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.install-steps-card__title {
  margin-bottom: 12px;
  font-weight: 700;
  color: white;
}

.install-step {
  display: flex;
  gap: 12px;
  align-items: flex-start;

  + .install-step {
    margin-top: 10px;
  }
}

.install-step__index {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border-radius: 999px;
  background: rgba(var(--q-primary-rgb), 0.16);
  border: 1px solid rgba(var(--q-primary-rgb), 0.4);
  color: white;
  font-size: 0.82rem;
  font-weight: 700;
}

.install-step__text {
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.92);
}

.install-panel__footer {
  margin-top: 14px;
  line-height: 1.5;
}
</style>
