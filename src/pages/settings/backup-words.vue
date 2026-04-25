<route lang="yaml">
meta:
  hideBottomNav: true
</route>

<template>
  <q-page
    class="backup-page dark-gradient vipr-mobile-page vipr-mobile-page--wide"
    data-testid="backup-words-page"
  >
    <div class="vipr-topbar vipr-topbar--comfortable backup-topbar">
      <q-btn
        flat
        round
        color="white"
        icon="arrow_back"
        class="vipr-topbar__back vipr-topbar__back--bleed backup-topbar__back"
        @click="goBack"
        data-testid="backup-words-back-btn"
      />
    </div>

    <div class="backup-page__content">
      <div class="backup-words-container vipr-page-panel">
        <div class="backup-warning-banner vipr-warning-card">
          Write this recovery phrase down in order and keep it somewhere safe.
        </div>

        <div class="words-grid vipr-word-grid">
          <q-card
            v-for="(word, index) in recoveryWords"
            :key="index"
            flat
            bordered
            class="word-card vipr-word-card"
            :data-testid="`backup-word-card-${index + 1}`"
          >
            <q-card-section class="vipr-word-card__section">
              <div class="vipr-word-card__number">{{ index + 1 }}</div>
              <div class="vipr-word-card__text" :data-testid="`backup-word-${index + 1}`">
                {{ word }}
              </div>
            </q-card-section>
          </q-card>
        </div>

        <div class="backup-info-card vipr-info-card">
          <div class="backup-info-card__title vipr-section-title">Store this secret safely</div>
          <div class="backup-info-card__copy vipr-caption">
            This is your real wallet recovery phrase. Anyone with it can recover your wallet.
          </div>
        </div>

        <q-btn
          label="I've written down my recovery phrase"
          color="primary"
          icon="check_circle"
          no-caps
          unelevated
          class="backup-confirm-btn vipr-btn vipr-btn--primary-soft vipr-btn--md"
          @click="confirmBackup"
          data-testid="backup-words-confirm-btn"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
defineOptions({
  name: 'BackupWordsPage',
})

import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from 'src/stores/wallet'
import { useAppNotify } from 'src/composables/useAppNotify'
import { getErrorMessage } from 'src/utils/error'

const router = useRouter()
const walletStore = useWalletStore()
const recoveryWords = ref<string[]>([])
const notify = useAppNotify()

onMounted(() => {
  loadRecoveryWords().catch((error) => {
    notify.error(`Failed to load recovery phrase: ${getErrorMessage(error)}`)
  })
})

async function confirmBackup() {
  walletStore.markMnemonicBackupConfirmed()
  await router.push({ name: '/settings/' })
}

async function goBack() {
  await router.push({ name: '/settings/' })
}

async function loadRecoveryWords() {
  const hasMnemonic = await walletStore.loadMnemonic()
  if (!hasMnemonic) {
    throw new Error('No wallet mnemonic found')
  }
  recoveryWords.value = [...walletStore.mnemonicWords]
}
</script>

<style scoped>
.backup-page__content {
  max-width: var(--vipr-backup-content-width);
  margin: 0 auto;
  padding: var(--vipr-backup-content-padding);
}

.backup-words-container {
  max-width: var(--vipr-backup-content-width);
  margin: 0 auto;
  padding: var(--vipr-backup-panel-padding);
}

.backup-warning-banner {
  margin-bottom: var(--vipr-backup-section-gap);
  padding: var(--vipr-backup-card-padding);
  border-radius: var(--vipr-radius-card);
  font-size: var(--vipr-font-size-body);
  font-weight: 600;
  line-height: var(--vipr-line-height-body);
}

.words-grid {
  margin-bottom: var(--vipr-backup-section-gap);
}

.backup-info-card {
  margin: var(--vipr-backup-section-gap) 0;
  padding: var(--vipr-backup-card-padding);
  border-radius: var(--vipr-radius-card);
}

.backup-info-card__title {
  margin-bottom: var(--vipr-backup-card-copy-gap);
}

.backup-words-container :deep(.q-btn:not(.q-btn--round)) {
  font-weight: 600;
  letter-spacing: 0;
}

.backup-confirm-btn {
  width: 100%;
  margin-bottom: var(--vipr-backup-action-gap);
}

/* Responsive adjustments for smaller screens */
@media (max-width: 599px) {
  .backup-words-container {
    padding: var(--vipr-backup-panel-padding-mobile);
    border-radius: var(--vipr-backup-panel-radius-mobile);
  }

  .backup-words-container .vipr-word-grid {
    grid-template-columns: 1fr;
    gap: var(--vipr-backup-word-grid-gap-mobile);
  }
}
</style>
