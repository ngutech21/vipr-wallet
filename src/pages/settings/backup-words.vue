<route lang="yaml">
meta:
  hideBottomNav: true
</route>

<template>
  <q-page
    class="backup-page dark-gradient vipr-mobile-page vipr-mobile-page--wide"
    data-testid="backup-words-page"
  >
    <ViprTopbar
      comfortable
      bleed
      button-color="white"
      topbar-class="backup-topbar"
      button-class="backup-topbar__back"
      button-test-id="backup-words-back-btn"
      @back="goBack"
    />

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
            This is your real wallet recovery phrase. Anyone with it can recover your wallet secret.
          </div>
        </div>

        <div
          class="backup-federations-card vipr-warning-card"
          data-testid="backup-federations-card"
        >
          <div class="backup-federations-card__header">
            <div>
              <div class="backup-federations-card__title vipr-section-title">
                Save your federation join codes
              </div>
              <div class="backup-federations-card__copy vipr-caption">
                Recovery words do not include your federation list. Save one join code for each
                federation you want to restore later.
              </div>
            </div>
            <q-btn
              v-if="federationInviteCodes.length > 1"
              icon="content_copy"
              flat
              round
              :disable="federationInviteCodes.length === 0"
              aria-label="Copy all federation join codes"
              data-testid="backup-federations-copy-all-btn"
              @click="copyAllInviteCodes"
            />
          </div>

          <div
            v-if="federationInviteCodes.length === 0"
            class="backup-federations-empty vipr-caption"
            data-testid="backup-federations-empty"
          >
            No federations are saved in this wallet yet.
          </div>

          <div v-else class="backup-federation-list" data-testid="backup-federations-list">
            <div
              v-for="federation in federationInviteCodes"
              :key="federation.federationId"
              class="backup-federation-item"
              :data-testid="`backup-federation-code-${federation.federationId}`"
            >
              <div class="backup-federation-item__copy">
                <div class="backup-federation-item__title">{{ federation.title }}</div>
                <div class="backup-federation-item__code">{{ federation.inviteCode }}</div>
              </div>
              <q-btn
                icon="content_copy"
                flat
                round
                :aria-label="`Copy join code for ${federation.title}`"
                :data-testid="`backup-federation-copy-${federation.federationId}`"
                @click="copyInviteCode(federation.inviteCode)"
              />
            </div>
          </div>
        </div>

        <q-btn
          label="I've written down my backup"
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

import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from 'src/stores/wallet'
import { useFederationStore } from 'src/stores/federation'
import { useAppNotify } from 'src/composables/useAppNotify'
import ViprTopbar from 'src/components/ViprTopbar.vue'
import { getErrorMessage } from 'src/utils/error'

const router = useRouter()
const walletStore = useWalletStore()
const federationStore = useFederationStore()
const recoveryWords = ref<string[]>([])
const notify = useAppNotify()
const federationInviteCodes = computed(() =>
  federationStore.federations
    .filter((federation) => federation.inviteCode.trim() !== '')
    .map((federation) => ({
      federationId: federation.federationId,
      title: federation.title,
      inviteCode: federation.inviteCode,
    })),
)

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

async function copyInviteCode(inviteCode: string) {
  try {
    await navigator.clipboard.writeText(inviteCode)
    notify.success('Federation join code copied', { timeout: 1000 })
  } catch (error) {
    notify.error(`Failed to copy federation join code: ${getErrorMessage(error)}`)
  }
}

async function copyAllInviteCodes() {
  const backupText = federationInviteCodes.value
    .map((federation) => `${federation.title}\n${federation.inviteCode}`)
    .join('\n\n')

  try {
    await navigator.clipboard.writeText(backupText)
    notify.success('Federation join codes copied', { timeout: 1000 })
  } catch (error) {
    notify.error(`Failed to copy federation join codes: ${getErrorMessage(error)}`)
  }
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

.backup-federations-card {
  margin: var(--vipr-backup-section-gap) 0;
  padding: var(--vipr-backup-card-padding);
  border-radius: var(--vipr-radius-card);
}

.backup-federations-card__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--vipr-space-3);
  align-items: start;
}

.backup-federations-card__title {
  margin-bottom: var(--vipr-backup-card-copy-gap);
}

.backup-federation-list {
  display: grid;
  gap: var(--vipr-backup-action-gap);
  margin-top: var(--vipr-backup-section-gap);
}

.backup-federation-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--vipr-space-3);
  align-items: center;
  padding: var(--vipr-space-3);
  border-radius: var(--vipr-radius-control);
  background: var(--vipr-copy-field-bg);
  border: 1px solid var(--vipr-copy-field-border);
}

.backup-federation-item__copy {
  min-width: 0;
}

.backup-federation-item__title {
  margin-bottom: var(--vipr-backup-card-copy-gap);
  color: var(--vipr-text-primary);
  font-size: var(--vipr-font-size-body);
  font-weight: 700;
  line-height: var(--vipr-line-height-body);
}

.backup-federation-item__code {
  overflow-wrap: anywhere;
  color: var(--vipr-text-secondary);
  font-family: var(--vipr-font-family-mono);
  font-size: var(--vipr-font-size-label);
  line-height: var(--vipr-line-height-body);
}

.backup-federations-empty {
  margin-top: var(--vipr-backup-section-gap);
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
