<route lang="yaml">
meta:
  hideBottomNav: true
</route>

<template>
  <q-page class="dark-gradient">
    <q-toolbar class="header-section">
      <q-btn flat round icon="arrow_back" @click="goBack" data-testid="backup-intro-back-btn" />
      <q-toolbar-title class="text-center no-wrap">Personal Backup</q-toolbar-title>
      <div class="q-ml-md" style="width: 40px"></div>
    </q-toolbar>

    <div class="q-pa-lg">
      <div class="backup-intro-container glass-effect q-pa-lg">
        <div class="flex flex-center q-mb-lg">
          <q-icon name="shield" size="4em" color="primary" />
        </div>

        <div class="text-h5 text-center q-mb-md">Backup Your Wallet</div>

        <div class="text-body1 q-mb-lg">
          <p>
            You're about to see your wallet's 12 recovery words. These words are the
            <strong>only way</strong> to recover your wallet if you lose access to this device.
          </p>
        </div>

        <q-card flat bordered class="warning-card q-mb-lg">
          <q-card-section class="bg-warning text-dark">
            <div class="flex items-start">
              <q-icon name="warning" size="md" class="q-mr-sm" />
              <div>
                <div class="text-subtitle1 text-weight-bold q-mb-xs">Important Instructions</div>
                <ul class="q-pl-md q-mb-none">
                  <li>Write down the words with pen and paper</li>
                  <li>Store them in a safe, secure location</li>
                  <li>Never share your recovery words with anyone</li>
                  <li>Never store them digitally (screenshots, cloud, etc.)</li>
                  <li>Anyone with these words can access your funds</li>
                </ul>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <div class="text-caption text-grey-6 text-center q-mb-lg">
          You will now see your real wallet recovery words.
        </div>

        <q-btn
          label="Show Recovery Words"
          color="primary"
          icon="visibility"
          class="full-width q-mb-sm"
          size="lg"
          @click="showRecoveryWords"
          data-testid="backup-intro-show-words-btn"
        />

        <q-btn
          label="Cancel"
          flat
          color="grey-6"
          class="full-width"
          @click="goBack"
          data-testid="backup-intro-cancel-btn"
        />
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
.backup-intro-container {
  max-width: 600px;
  margin: 0 auto;
  border-radius: 16px;
}

.warning-card {
  border-radius: 8px;
  border-color: var(--q-warning);
  border-width: 2px;
}

.full-width {
  width: 100%;
}
</style>
