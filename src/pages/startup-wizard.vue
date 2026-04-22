<route lang="yaml">
meta:
  hideBottomNav: true
</route>

<template>
  <q-page class="dark-gradient startup-wizard-page" data-testid="startup-wizard-page">
    <div class="wizard-shell">
      <q-card flat class="wizard-card">
        <q-card-section class="wizard-card__section">
          <div v-if="currentStep === 'install' && showInstallStep">
            <StartupWizardInstallStep
              :install-hint-description="installHintDescription"
              :install-instruction="installInstruction"
              :needs-native-browser="needsNativeBrowser"
              :recommended-browser-label="recommendedBrowserLabel"
              @continue="continueFromInstall"
            />
          </div>

          <div
            v-else-if="currentStep === 'welcome'"
            class="wizard-slide wizard-slide--welcome"
            data-testid="startup-wizard-welcome-step"
          >
            <div class="wizard-visual wizard-visual--welcome">
              <div class="welcome-orb welcome-orb--large"></div>
              <div class="welcome-orb welcome-orb--small"></div>
              <div class="welcome-orb welcome-orb--tiny"></div>
            </div>

            <div class="wizard-copy">
              <div class="wizard-kicker">Welcome</div>
              <h1 class="wizard-title">Private ecash for everyday Bitcoin payments</h1>
              <p class="wizard-body">
                Vipr Wallet lets you hold and send federated ecash for fast, private payments. We’ll
                cover a few important things before you start.
              </p>
            </div>

            <div class="wizard-actions wizard-actions--stack">
              <q-btn
                label="Create new wallet"
                unelevated
                no-caps
                class="wizard-primary-btn"
                :disable="isCreating || isRestoring"
                data-testid="startup-wizard-create-btn"
                @click="startCreateFlow"
              />
              <q-btn
                flat
                no-caps
                class="wizard-secondary-btn"
                :disable="isCreating || isRestoring"
                data-testid="startup-wizard-restore-btn"
                @click="startRestoreFlow"
              >
                Restore wallet
              </q-btn>
            </div>
          </div>

          <div
            v-else-if="currentStep === 'custody'"
            class="wizard-slide"
            data-testid="startup-wizard-custody-step"
          >
            <button
              type="button"
              class="wizard-skip"
              data-testid="startup-wizard-skip-btn"
              @click="skipCreateEducation"
            >
              Skip
            </button>

            <div class="wizard-visual wizard-visual--custody">
              <div class="custody-ring custody-ring--outer"></div>
              <div class="custody-ring custody-ring--middle"></div>
              <div class="custody-ring custody-ring--inner"></div>
            </div>

            <div class="wizard-copy">
              <div class="wizard-kicker">How it works</div>
              <h2 class="wizard-title">Ecash is custodial</h2>
              <p class="wizard-body">
                Your funds are held by a federation you choose. That makes payments simple and fast,
                but it also means your choice of federation matters.
              </p>
            </div>

            <div class="wizard-footer">
              <q-btn
                flat
                no-caps
                class="wizard-secondary-btn"
                data-testid="startup-wizard-custody-back-btn"
                @click="backToWelcome"
              >
                Back
              </q-btn>
              <q-btn
                label="Next"
                unelevated
                no-caps
                class="wizard-primary-btn"
                data-testid="startup-wizard-custody-next-btn"
                @click="goToFederationStep"
              />
            </div>
          </div>

          <div
            v-else-if="currentStep === 'federation'"
            class="wizard-slide"
            data-testid="startup-wizard-federation-step"
          >
            <button
              type="button"
              class="wizard-skip"
              data-testid="startup-wizard-skip-btn"
              @click="skipCreateEducation"
            >
              Skip
            </button>

            <div class="wizard-visual wizard-visual--federation">
              <div class="federation-card federation-card--left">Trusted federation</div>
              <div class="federation-card federation-card--center">Your ecash</div>
              <div class="federation-card federation-card--right">Reviews & reputation</div>
            </div>

            <div class="wizard-copy">
              <div class="wizard-kicker">Choose carefully</div>
              <h2 class="wizard-title">Pick a federation you trust</h2>
              <p class="wizard-body">
                After setup, you’ll join a federation to hold and manage your ecash. Look for one
                you recognize and trust before storing meaningful funds.
              </p>
            </div>

            <div class="wizard-footer">
              <q-btn
                flat
                no-caps
                class="wizard-secondary-btn"
                data-testid="startup-wizard-federation-back-btn"
                @click="backToCustody"
              >
                Back
              </q-btn>
              <q-btn
                label="Next"
                unelevated
                no-caps
                class="wizard-primary-btn"
                :loading="isCreating"
                :disable="isRestoring"
                data-testid="startup-wizard-federation-next-btn"
                @click="continueFromFederation"
              />
            </div>
          </div>

          <div
            v-else-if="currentStep === 'backup'"
            class="wizard-slide"
            data-testid="startup-wizard-backup-step"
          >
            <div class="wizard-copy wizard-copy--compact">
              <div class="wizard-kicker">Backup</div>
              <h2 class="wizard-title">Save your recovery phrase</h2>
              <p class="wizard-body">
                These 12 words are the only way to restore this wallet on another device.
              </p>
            </div>

            <StartupWizardBackupStep
              :mnemonic-words="mnemonicWords"
              @back="backFromBackup"
              @confirm="finishBackup"
            />
          </div>

          <div
            v-else-if="currentStep === 'restore'"
            class="wizard-slide"
            data-testid="startup-wizard-restore-step"
          >
            <div class="wizard-copy wizard-copy--compact">
              <div class="wizard-kicker">Restore</div>
              <h2 class="wizard-title">Restore your wallet</h2>
              <p class="wizard-body">
                Enter your 12-word recovery phrase to restore this wallet on this device.
              </p>
            </div>

            <StartupWizardRestoreStep
              v-model:restore-words="restoreWords"
              :is-creating="isCreating"
              :is-restoring="isRestoring"
              @back="backFromRestore"
              @submit="submitRestore"
            />
          </div>

          <div
            v-else-if="currentStep === 'done'"
            class="wizard-slide wizard-slide--done"
            data-testid="startup-wizard-done-step"
          >
            <div class="wizard-visual wizard-visual--done"></div>

            <div class="wizard-copy">
              <div class="wizard-kicker">You’re all set</div>
              <h2 class="wizard-title">Your wallet is ready</h2>
              <p class="wizard-body">
                You can start using Vipr now. For larger savings or full control, consider a
                non-custodial wallet.
              </p>
            </div>

            <div class="wizard-actions wizard-actions--stack">
              <q-btn
                label="Get started"
                unelevated
                no-caps
                class="wizard-primary-btn"
                data-testid="startup-wizard-done-btn"
                @click="finishWizardAndEnterApp"
              />
            </div>
          </div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
defineOptions({
  name: 'StartupWizardPage',
})

import { onBeforeUnmount, onMounted } from 'vue'
import StartupWizardBackupStep from 'src/components/startup-wizard/StartupWizardBackupStep.vue'
import StartupWizardInstallStep from 'src/components/startup-wizard/StartupWizardInstallStep.vue'
import StartupWizardRestoreStep from 'src/components/startup-wizard/StartupWizardRestoreStep.vue'
import { useInstallHint } from 'src/composables/useInstallHint'
import { useStartupWizard } from 'src/composables/useStartupWizard'
import { useAppNotify } from 'src/composables/useAppNotify'
import { getErrorMessage } from 'src/utils/error'

const notify = useAppNotify()
const {
  installInstruction,
  installHintDescription,
  needsNativeBrowser,
  recommendedBrowserLabel,
  showInstallStep,
  initializeInstallHint,
  removeInstallHintListeners,
} = useInstallHint()
const {
  currentStep,
  finishBackup,
  finishWizardAndEnterApp,
  goToFederationStep,
  isCreating,
  isRestoring,
  mnemonicWords,
  restoreWords,
  backFromBackup,
  backFromRestore,
  backToCustody,
  backToWelcome,
  continueFromFederation,
  continueFromInstall,
  initializeWizard,
  skipCreateEducation,
  startCreateFlow,
  startRestoreFlow,
  submitRestore,
} = useStartupWizard({ showInstallStep })

onMounted(() => {
  initializeInstallHint()
  initializeWizard().catch((error) => {
    notify.error(`Failed to initialize startup wizard: ${getErrorMessage(error)}`)
  })
})

onBeforeUnmount(() => {
  removeInstallHintListeners()
})
</script>

<style scoped>
.startup-wizard-page {
  padding: 16px;
}

.wizard-shell {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wizard-card {
  width: 100%;
  max-width: 560px;
  border-radius: 32px;
  color: white;
  background:
    radial-gradient(circle at top left, rgba(var(--q-primary-rgb), 0.2), transparent 34%),
    radial-gradient(circle at 85% 12%, rgba(var(--q-primary-rgb), 0.1), transparent 20%),
    linear-gradient(180deg, rgba(24, 24, 28, 0.98), rgba(15, 15, 18, 1));
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 26px 70px rgba(0, 0, 0, 0.44);
}

.wizard-card__section {
  padding: 28px 24px 24px;
}

.wizard-slide {
  min-height: 680px;
  display: flex;
  flex-direction: column;
}

.wizard-slide--welcome,
.wizard-slide--done {
  justify-content: center;
}

.wizard-copy {
  margin-top: auto;
}

.wizard-copy--compact {
  margin-top: 0;
  margin-bottom: 20px;
}

.wizard-kicker {
  margin-bottom: 8px;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.62);
}

.wizard-title {
  margin: 0;
  font-size: 2.2rem;
  line-height: 1.1;
  font-weight: 700;
}

.wizard-body {
  margin: 14px 0 0;
  font-size: 1.18rem;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.78);
}

.wizard-actions,
.wizard-footer {
  margin-top: 24px;
}

.wizard-actions--stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.wizard-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.wizard-primary-btn,
.wizard-secondary-btn {
  min-height: 54px;
  border-radius: 18px;
}

.wizard-primary-btn {
  flex: 1;
  background: white !important;
  color: #111827 !important;
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.28);
}

.wizard-secondary-btn {
  flex: 1;
  color: rgba(255, 255, 255, 0.92) !important;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.04);
}

.wizard-skip {
  align-self: flex-end;
  padding: 0;
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.66);
  font-size: 0.98rem;
  cursor: pointer;
}

.wizard-visual {
  position: relative;
  flex: 1;
  min-height: 300px;
  margin-bottom: 28px;
}

.wizard-visual--welcome,
.wizard-visual--custody,
.wizard-visual--federation {
  display: flex;
  align-items: center;
  justify-content: center;
}

.welcome-orb {
  position: absolute;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.welcome-orb--large {
  width: 280px;
  height: 280px;
}

.welcome-orb--small {
  width: 180px;
  height: 180px;
  top: 28px;
  left: 30px;
}

.welcome-orb--tiny {
  width: 110px;
  height: 110px;
  right: 34px;
  bottom: 24px;
}

.custody-ring {
  position: absolute;
  border-radius: 999px;
  border: 24px solid rgba(var(--q-primary-rgb), 0.16);
}

.custody-ring--outer {
  width: 300px;
  height: 300px;
}

.custody-ring--middle {
  width: 210px;
  height: 210px;
}

.custody-ring--inner {
  width: 120px;
  height: 120px;
  background: rgba(var(--q-primary-rgb), 0.14);
  border-width: 18px;
}

.federation-card {
  position: absolute;
  display: grid;
  place-items: center;
  width: 180px;
  height: 120px;
  padding: 16px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  text-align: center;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.federation-card--left {
  transform: rotate(-10deg);
  left: 10px;
  bottom: 24px;
}

.federation-card--center {
  z-index: 1;
}

.federation-card--right {
  transform: rotate(10deg);
  right: 10px;
  top: 32px;
}

.wizard-visual--done {
  min-height: 220px;
  background:
    radial-gradient(circle at 25% 20%, rgba(255, 244, 173, 0.55), transparent 12%),
    radial-gradient(circle at 70% 34%, rgba(255, 145, 214, 0.52), transparent 10%),
    radial-gradient(circle at 30% 70%, rgba(120, 232, 255, 0.4), transparent 10%),
    radial-gradient(circle at 82% 76%, rgba(255, 255, 255, 0.34), transparent 8%);
}

.startup-wizard-page :deep(.words-grid .q-card),
.startup-wizard-page :deep(.restore-grid .q-field__control) {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
  color: white;
}

.startup-wizard-page :deep(.restore-grid .q-field__label),
.startup-wizard-page :deep(.restore-grid .q-field__native),
.startup-wizard-page :deep(.restore-grid input) {
  color: rgba(255, 255, 255, 0.92) !important;
}

.startup-wizard-page :deep(.restore-grid .q-field--outlined .q-field__control:before),
.startup-wizard-page :deep(.restore-grid .q-field--outlined .q-field__control:after) {
  border-color: rgba(255, 255, 255, 0.1);
}

.startup-wizard-page :deep([data-testid='startup-wizard-backup-confirm-btn']),
.startup-wizard-page :deep([data-testid='startup-wizard-restore-submit-btn']) {
  background: white !important;
  color: #111827 !important;
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.28);
}

.startup-wizard-page :deep([data-testid='startup-wizard-backup-back-btn']),
.startup-wizard-page :deep([data-testid='startup-wizard-restore-back-btn']) {
  color: rgba(255, 255, 255, 0.92) !important;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.04);
}

@media (max-width: 599px) {
  .startup-wizard-page {
    padding: 8px;
  }

  .wizard-card__section {
    padding: 22px 18px 18px;
  }

  .wizard-slide {
    min-height: 620px;
  }

  .wizard-title {
    font-size: 1.9rem;
  }

  .wizard-body {
    font-size: 1.05rem;
  }

  .wizard-footer {
    flex-direction: column;
  }

  .federation-card {
    width: 148px;
    height: 108px;
    font-size: 0.92rem;
  }
}
</style>
