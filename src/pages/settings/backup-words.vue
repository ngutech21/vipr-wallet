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

    <div class="backup-page__content q-px-md q-pb-xl">
      <div class="backup-words-container vipr-page-panel">
        <div class="backup-warning-banner vipr-warning-card q-mb-md">
          Write this recovery phrase down in order and keep it somewhere safe.
        </div>

        <div class="words-grid vipr-word-grid q-mb-lg">
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

        <div class="backup-info-card vipr-info-card q-mb-lg">
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
          class="full-width q-mb-sm vipr-btn vipr-btn--primary-soft vipr-btn--md"
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
  max-width: 760px;
  margin: 0 auto;
}

.backup-words-container {
  max-width: 760px;
  margin: 0 auto;
  padding: 20px;
}

.backup-warning-banner {
  padding: 14px 16px;
  border-radius: var(--vipr-radius-card);
  font-size: var(--vipr-font-size-body);
  font-weight: 600;
  line-height: 1.4;
}

.backup-info-card {
  padding: 16px 18px;
  border-radius: var(--vipr-radius-card);
}

.backup-info-card__title {
  margin-bottom: 6px;
}

.full-width {
  width: 100%;
}

.backup-words-container :deep(.q-btn:not(.q-btn--round)) {
  font-weight: 600;
  letter-spacing: 0;
}

/* Responsive adjustments for smaller screens */
@media (max-width: 599px) {
  .backup-words-container {
    padding: 18px;
    border-radius: 28px;
  }

  .backup-words-container .vipr-word-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}
</style>
