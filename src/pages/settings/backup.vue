<route lang="yaml">
meta:
  hideBottomNav: true
</route>

<template>
  <q-page
    class="backup-page dark-gradient vipr-mobile-page vipr-mobile-page--wide"
    data-testid="backup-intro-page"
  >
    <div class="vipr-topbar vipr-topbar--comfortable backup-topbar">
      <q-btn
        flat
        round
        color="white"
        icon="arrow_back"
        class="vipr-topbar__back vipr-topbar__back--bleed backup-topbar__back"
        @click="goBack"
        data-testid="backup-intro-back-btn"
      />
    </div>

    <div class="backup-page__content q-px-md q-pb-xl">
      <div class="backup-intro-container">
        <div class="backup-intro-hero">
          <div class="backup-intro-hero__icon">
            <q-icon name="shield" size="38px" color="white" />
          </div>
          <div>
            <div class="backup-intro-hero__eyebrow">Backup</div>
            <div class="backup-intro-hero__title" data-testid="backup-intro-title">
              Save your recovery phrase
            </div>
            <div class="backup-intro-hero__copy">
              Your recovery phrase is the only way to restore this wallet if you lose access to this
              device.
            </div>
          </div>
        </div>

        <div class="backup-warning-card q-mt-md">
          <div class="backup-warning-card__title">Before you continue</div>
          <ul class="backup-warning-list q-mb-none">
            <li>Write the phrase down with pen and paper.</li>
            <li>Store it somewhere safe and private.</li>
            <li>Never share it with anyone.</li>
            <li>Do not save it in screenshots, notes or cloud storage.</li>
          </ul>
        </div>

        <div class="backup-actions q-mt-lg">
          <q-btn
            label="Show recovery phrase"
            color="primary"
            icon="visibility"
            no-caps
            unelevated
            class="full-width q-mb-sm"
            @click="showRecoveryWords"
            data-testid="backup-intro-show-words-btn"
          />

          <q-btn
            label="Cancel"
            flat
            no-caps
            color="grey-6"
            class="full-width"
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
  max-width: 760px;
  margin: 0 auto;
}

.backup-intro-container {
  max-width: 720px;
  margin: 0 auto;
  padding: 20px;
  border-radius: 32px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02)),
    rgba(18, 18, 18, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.backup-intro-hero {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.backup-intro-hero__icon {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.backup-intro-hero__eyebrow {
  margin-bottom: 6px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.backup-intro-hero__title {
  margin-bottom: 10px;
  color: white;
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.05;
}

.backup-intro-hero__copy {
  color: rgba(255, 255, 255, 0.78);
  line-height: 1.5;
}

.backup-warning-card {
  padding: 16px 18px;
  border-radius: 24px;
  background: rgba(255, 184, 77, 0.12);
  border: 1px solid rgba(255, 184, 77, 0.2);
  color: rgba(255, 240, 220, 0.95);
}

.backup-warning-card__title {
  margin-bottom: 10px;
  font-size: 1rem;
  font-weight: 700;
}

.backup-warning-list {
  padding-left: 18px;
  color: rgba(255, 255, 255, 0.82);
}

.backup-warning-list li + li {
  margin-top: 6px;
}

.full-width {
  width: 100%;
}

.backup-actions :deep(.q-btn:not(.q-btn--round)) {
  min-height: 48px;
  border-radius: 16px;
  font-weight: 600;
  letter-spacing: 0;
}

.backup-actions :deep(.q-btn.bg-primary) {
  background: linear-gradient(135deg, rgba(162, 43, 255, 1), rgba(116, 0, 255, 0.96)) !important;
  color: white !important;
  box-shadow:
    0 7px 16px rgba(111, 0, 255, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.16);
}

@media (max-width: 599px) {
  .backup-intro-container {
    padding: 18px;
    border-radius: 28px;
  }

  .backup-intro-hero {
    grid-template-columns: 1fr;
  }

  .backup-intro-hero__icon {
    width: 64px;
    height: 64px;
    border-radius: 20px;
  }

  .backup-intro-hero__title {
    font-size: 1.7rem;
  }
}
</style>
