<route lang="yaml">
meta:
  hideBottomNav: true
</route>

<template>
  <q-page class="dark-gradient">
    <q-toolbar class="header-section">
      <q-btn flat round icon="arrow_back" @click="goBack" />
      <q-toolbar-title class="text-center no-wrap">Recovery Words</q-toolbar-title>
      <div class="q-ml-md" style="width: 40px"></div>
    </q-toolbar>

    <div class="q-pa-lg">
      <div class="backup-words-container">
        <q-card flat class="warning-banner q-mb-md">
          <q-card-section class="bg-warning text-dark q-py-sm">
            <div class="flex items-center justify-center">
              <q-icon name="warning" size="sm" class="q-mr-xs" />
              <span class="text-subtitle2 text-weight-bold">
                Write these words down in order. Keep them safe and private.
              </span>
            </div>
          </q-card-section>
        </q-card>

        <div class="words-grid q-mb-lg">
          <q-card
            v-for="(word, index) in recoveryWords"
            :key="index"
            flat
            bordered
            class="word-card glass-effect"
          >
            <q-card-section class="q-pa-md">
              <div class="word-number text-caption text-grey-6">{{ index + 1 }}</div>
              <div class="word-text text-h6 text-weight-medium">{{ word }}</div>
            </q-card-section>
          </q-card>
        </div>

        <q-card flat bordered class="info-card q-mb-lg">
          <q-card-section class="bg-info text-dark q-pa-md">
            <div class="flex items-start">
              <q-icon name="info" size="md" class="q-mr-sm" />
              <div>
                <div class="text-subtitle2 text-weight-bold q-mb-xs">
                  Placeholder Recovery Words
                </div>
                <div class="text-caption">
                  These are temporary placeholder words. Full recovery functionality will be
                  available when the Fedimint SDK supports mnemonic generation.
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <q-btn
          label="I've Written Down My Words"
          color="primary"
          icon="check_circle"
          class="full-width q-mb-sm"
          size="lg"
          @click="confirmBackup"
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
import { useRouter } from 'vue-router/auto'
import { useWalletStore } from 'src/stores/wallet'

const router = useRouter()
const recoveryWords = ref<string[]>([])
const walletStore = useWalletStore()

onMounted(async () => {
  const mnemonic = await walletStore.getMnemonic()
  recoveryWords.value = mnemonic !== null && mnemonic !== undefined ? mnemonic : []
})

async function confirmBackup() {
  await router.push({ name: '/settings/' })
}

async function goBack() {
  await router.push({ name: '/settings/backup' })
}
</script>

<style scoped>
.backup-words-container {
  max-width: 700px;
  margin: 0 auto;
}

.warning-banner {
  border-radius: 8px;
}

.words-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.word-card {
  border-radius: 8px;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.word-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.word-number {
  font-size: 0.7rem;
  margin-bottom: 4px;
}

.word-text {
  font-family: 'Courier New', monospace;
  letter-spacing: 0.5px;
  user-select: none;
}

.info-card {
  border-radius: 8px;
  border-color: var(--q-info);
  border-width: 2px;
}

.full-width {
  width: 100%;
}

/* Responsive adjustments for smaller screens */
@media (max-width: 599px) {
  .words-grid {
    gap: 10px;
  }

  .word-card {
    padding: 8px;
  }

  .word-text {
    font-size: 1.1rem;
  }
}
</style>
