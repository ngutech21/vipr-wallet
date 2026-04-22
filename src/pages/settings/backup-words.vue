<route lang="yaml">
meta:
  hideBottomNav: true
</route>

<template>
  <q-page class="backup-page dark-gradient" data-testid="backup-words-page">
    <div class="backup-topbar">
      <q-btn
        flat
        round
        color="white"
        icon="arrow_back"
        class="backup-topbar__back"
        @click="goBack"
        data-testid="backup-words-back-btn"
      />
    </div>

    <div class="backup-page__content q-px-md q-pb-xl">
      <div class="backup-words-container">
        <div class="backup-warning-banner q-mb-md">
          Write this recovery phrase down in order and keep it somewhere safe.
        </div>

        <div class="words-grid q-mb-lg">
          <q-card
            v-for="(word, index) in recoveryWords"
            :key="index"
            flat
            bordered
            class="word-card"
            :data-testid="`backup-word-card-${index + 1}`"
          >
            <q-card-section class="word-card__section">
              <div class="word-number text-caption text-grey-6">{{ index + 1 }}</div>
              <div
                class="word-text text-h6 text-weight-medium"
                :data-testid="`backup-word-${index + 1}`"
              >
                {{ word }}
              </div>
            </q-card-section>
          </q-card>
        </div>

        <div class="backup-info-card q-mb-lg">
          <div class="backup-info-card__title">Store this secret safely</div>
          <div class="backup-info-card__copy">
            This is your real wallet recovery phrase. Anyone with it can recover your wallet.
          </div>
        </div>

        <q-btn
          label="I've written down my recovery phrase"
          color="primary"
          icon="check_circle"
          class="full-width q-mb-sm"
          size="lg"
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
.backup-page {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
}

.backup-topbar {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 12px 16px 8px;
}

.backup-topbar__back {
  margin-left: -4px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.backup-page__content {
  max-width: 760px;
  margin: 0 auto;
}

.backup-words-container {
  max-width: 760px;
  margin: 0 auto;
  padding: 20px;
  border-radius: 32px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02)),
    rgba(18, 18, 18, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.backup-warning-banner {
  padding: 14px 16px;
  border-radius: 22px;
  background: rgba(255, 184, 77, 0.12);
  border: 1px solid rgba(255, 184, 77, 0.2);
  color: rgba(255, 244, 224, 0.96);
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.4;
}

.words-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.word-card {
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.03)),
    rgba(35, 35, 35, 0.92);
  border-color: rgba(255, 255, 255, 0.07);
}

.word-card__section {
  padding: 14px 16px;
}

.word-number {
  font-size: 0.7rem;
  margin-bottom: 6px;
}

.word-text {
  color: white;
  font-family: 'Courier New', monospace;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  user-select: none;
}

.backup-info-card {
  padding: 16px 18px;
  border-radius: 24px;
  background: rgba(82, 197, 255, 0.1);
  border: 1px solid rgba(82, 197, 255, 0.16);
}

.backup-info-card__title {
  margin-bottom: 6px;
  color: white;
  font-size: 1rem;
  font-weight: 700;
}

.backup-info-card__copy {
  color: rgba(255, 255, 255, 0.78);
  line-height: 1.45;
}

.full-width {
  width: 100%;
}

/* Responsive adjustments for smaller screens */
@media (max-width: 599px) {
  .backup-words-container {
    padding: 18px;
    border-radius: 28px;
  }

  .words-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .word-text {
    font-size: 1.1rem;
  }
}
</style>
