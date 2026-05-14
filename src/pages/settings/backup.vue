<route lang="yaml">
meta:
  hideBottomNav: true
</route>

<template>
  <q-page
    class="backup-page dark-gradient vipr-mobile-page vipr-mobile-page--wide"
    data-testid="backup-intro-page"
  >
    <ViprTopbar
      comfortable
      bleed
      button-color="white"
      topbar-class="backup-topbar"
      button-class="backup-topbar__back"
      button-test-id="backup-intro-back-btn"
      @back="goBack"
    />

    <div class="backup-page__content">
      <div class="backup-intro-container vipr-page-panel">
        <div class="backup-intro-hero">
          <div class="backup-intro-hero__icon">
            <q-icon name="shield" size="38px" color="white" />
          </div>
          <div>
            <div class="backup-intro-hero__eyebrow vipr-eyebrow">Backup</div>
            <div
              class="backup-intro-hero__title vipr-display-title"
              data-testid="backup-intro-title"
            >
              Save your recovery phrase
            </div>
            <div class="backup-intro-hero__copy vipr-lede">
              Your recovery phrase is the only way to restore this wallet if you lose access to this
              device.
            </div>
          </div>
        </div>

        <div class="backup-warning-card vipr-warning-card">
          <div class="backup-warning-card__title vipr-section-title">Before you continue</div>
          <ul class="backup-warning-list">
            <li>Write the phrase down with pen and paper.</li>
            <li>Store it somewhere safe and private.</li>
            <li>Save the join code for each federation you want to restore later.</li>
            <li>Never share it with anyone.</li>
            <li>Do not save it in screenshots, notes or cloud storage.</li>
          </ul>
        </div>

        <div class="backup-actions">
          <q-btn
            label="Show recovery phrase"
            color="primary"
            icon="visibility"
            no-caps
            unelevated
            class="backup-action-button backup-action-primary vipr-btn vipr-btn--primary-soft vipr-btn--md"
            @click="showRecoveryWords"
            data-testid="backup-intro-show-words-btn"
          />

          <q-btn
            label="Cancel"
            flat
            no-caps
            class="backup-action-button vipr-btn vipr-btn--secondary vipr-btn--md"
            @click="goBack"
            data-testid="backup-intro-cancel-btn"
          />
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
defineOptions({
  name: 'BackupIntroPage',
})

import { useRouter } from 'vue-router'
import ViprTopbar from 'src/components/ViprTopbar.vue'

const router = useRouter()

async function showRecoveryWords() {
  await router.push({ name: '/settings/backup-words' })
}

async function goBack() {
  await router.push({ name: '/settings/' })
}
</script>

<style scoped>
.backup-page__content {
  max-width: var(--vipr-backup-content-width);
  margin: 0 auto;
  padding: var(--vipr-backup-content-padding);
}

.backup-intro-container {
  max-width: var(--vipr-backup-panel-width);
  margin: 0 auto;
  padding: var(--vipr-backup-panel-padding);
}

.backup-intro-hero {
  display: grid;
  grid-template-columns: var(--vipr-backup-hero-icon-size) minmax(0, 1fr);
  gap: var(--vipr-backup-hero-gap);
  align-items: start;
}

.backup-intro-hero__icon {
  width: var(--vipr-backup-hero-icon-size);
  height: var(--vipr-backup-hero-icon-size);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--vipr-radius-card);
  background: var(--vipr-row-icon-bg-subtle);
  border: 1px solid var(--vipr-surface-card-border-subtle);
}

.backup-intro-hero__eyebrow {
  margin-bottom: var(--vipr-backup-eyebrow-bottom-space);
}

.backup-intro-hero__title {
  margin-bottom: var(--vipr-backup-title-bottom-space);
}

.backup-warning-card {
  margin-top: var(--vipr-backup-section-gap);
  padding: var(--vipr-backup-card-padding);
  border-radius: var(--vipr-radius-card);
}

.backup-warning-card__title {
  margin-bottom: var(--vipr-backup-card-title-bottom-space);
}

.backup-warning-list {
  margin: 0;
  padding-left: var(--vipr-backup-list-padding);
  color: var(--vipr-text-secondary);
}

.backup-warning-list li + li {
  margin-top: var(--vipr-backup-list-item-gap);
}

.backup-action-button {
  width: 100%;
}

.backup-actions :deep(.q-btn:not(.q-btn--round)) {
  font-weight: 600;
  letter-spacing: 0;
}

.backup-actions {
  margin-top: var(--vipr-backup-section-gap);
}

.backup-action-primary {
  margin-bottom: var(--vipr-backup-action-gap);
}

@media (max-width: 599px) {
  .backup-intro-container {
    padding: var(--vipr-backup-panel-padding-mobile);
    border-radius: var(--vipr-backup-panel-radius-mobile);
  }

  .backup-intro-hero {
    grid-template-columns: 1fr;
  }

  .backup-intro-hero__icon {
    width: var(--vipr-backup-hero-icon-size-mobile);
    height: var(--vipr-backup-hero-icon-size-mobile);
    border-radius: var(--vipr-backup-hero-icon-radius-mobile);
  }

  .backup-intro-hero__title {
    font-size: var(--vipr-font-size-title);
  }
}
</style>
