<route lang="yaml">
meta:
  hideBottomNav: true
</route>

<template>
  <q-page class="dark-gradient startup-wizard-page" data-testid="startup-wizard-page">
    <div class="wizard-shell">
      <q-card flat class="wizard-card vipr-page-panel">
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
                class="wizard-primary-btn vipr-btn vipr-btn--primary-soft"
                :disable="isCreating || isRestoring"
                data-testid="startup-wizard-create-btn"
                @click="startCreateFlow"
              />
              <q-btn
                flat
                no-caps
                class="wizard-secondary-btn vipr-btn vipr-btn--secondary"
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
                class="wizard-secondary-btn vipr-btn vipr-btn--secondary"
                data-testid="startup-wizard-custody-back-btn"
                @click="backToWelcome"
              >
                Back
              </q-btn>
              <q-btn
                label="Next"
                unelevated
                no-caps
                class="wizard-primary-btn vipr-btn vipr-btn--primary-soft"
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
                class="wizard-secondary-btn vipr-btn vipr-btn--secondary"
                data-testid="startup-wizard-federation-back-btn"
                @click="backToCustody"
              >
                Back
              </q-btn>
              <q-btn
                label="Next"
                unelevated
                no-caps
                class="wizard-primary-btn vipr-btn vipr-btn--primary-soft"
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
                class="wizard-primary-btn vipr-btn vipr-btn--primary-soft"
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
  padding: var(--vipr-wizard-page-padding);
}

.wizard-shell {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wizard-card {
  width: 100%;
  max-width: var(--vipr-width-flow-panel);
  color: var(--vipr-text-primary);
}

.wizard-card__section {
  padding: var(--vipr-wizard-card-padding);
}

.wizard-slide {
  min-height: var(--vipr-wizard-slide-min-height);
  display: flex;
  flex-direction: column;
}

.wizard-slide--welcome,
.wizard-slide--done {
  justify-content: flex-start;
}

.wizard-copy {
  margin-top: 0;
}

.wizard-copy--compact {
  margin-top: 0;
  margin-bottom: var(--vipr-wizard-compact-copy-gap);
}

.wizard-kicker {
  margin-bottom: var(--vipr-space-2);
}

.wizard-title {
  margin: 0;
}

.wizard-body {
  margin: var(--vipr-wizard-body-gap) 0 0;
}

.wizard-actions,
.wizard-footer {
  margin-top: auto;
  padding-top: var(--vipr-wizard-actions-top-space);
}

.wizard-actions--stack {
  display: flex;
  flex-direction: column;
  gap: var(--vipr-wizard-actions-gap);
}

.wizard-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--vipr-wizard-actions-gap);
}

.wizard-primary-btn,
.wizard-secondary-btn {
  min-height: var(--vipr-wizard-button-height);
  border-radius: var(--vipr-radius-button-lg);
}

.wizard-primary-btn {
  flex: 1 1 0;
  min-width: 0;
}

.wizard-secondary-btn {
  flex: 1 1 0;
  min-width: 0;
}

.wizard-actions--stack .wizard-primary-btn,
.wizard-actions--stack .wizard-secondary-btn {
  width: 100%;
  min-width: 0;
}

.wizard-skip {
  align-self: flex-end;
  padding: var(--vipr-space-0);
  border: 0;
  background: transparent;
  color: var(--vipr-text-muted);
  font-size: var(--vipr-wizard-skip-font-size);
  cursor: pointer;
}

.wizard-visual {
  position: relative;
  flex: 1;
  min-height: var(--vipr-wizard-visual-min-height);
  margin-bottom: var(--vipr-wizard-visual-bottom-space);
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
  border-radius: var(--vipr-radius-pill);
  background: var(--vipr-wizard-orb-bg);
  border: 1px solid var(--vipr-wizard-orb-border);
}

.welcome-orb--large {
  width: 280px;
  height: 280px;
}

.welcome-orb--small {
  width: 180px;
  height: 180px;
  top: var(--vipr-space-7);
  left: 30px;
}

.welcome-orb--tiny {
  width: 110px;
  height: 110px;
  right: 34px;
  bottom: var(--vipr-space-6);
}

.custody-ring {
  position: absolute;
  border-radius: var(--vipr-radius-pill);
  border: var(--vipr-space-6) solid var(--vipr-wizard-ring-border);
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
  background: var(--vipr-wizard-ring-bg);
  border-width: var(--vipr-space-4-5);
}

.federation-card {
  position: absolute;
  display: grid;
  place-items: center;
  width: 180px;
  height: 120px;
  padding: var(--vipr-wizard-federation-card-padding);
  border-radius: var(--vipr-radius-card);
  background: var(--vipr-control-panel-bg);
  border: 1px solid var(--vipr-control-panel-border);
  text-align: center;
  font-weight: 600;
  color: var(--vipr-text-primary);
}

.federation-card--left {
  transform: rotate(-10deg);
  left: 10px;
  bottom: var(--vipr-space-6);
}

.federation-card--center {
  z-index: 1;
}

.federation-card--right {
  transform: rotate(10deg);
  right: 10px;
  top: var(--vipr-space-8);
}

.wizard-visual--done {
  min-height: 220px;
  background: var(--vipr-wizard-done-visual-bg);
}

@media (max-width: 599px) {
  .startup-wizard-page {
    padding: var(--vipr-wizard-page-padding-mobile);
  }

  .wizard-card__section {
    padding: var(--vipr-wizard-card-padding-mobile);
  }

  .wizard-slide {
    min-height: var(--vipr-wizard-slide-min-height-mobile);
  }

  .wizard-visual {
    min-height: var(--vipr-wizard-visual-min-height-mobile);
    margin-bottom: var(--vipr-wizard-visual-bottom-space-mobile);
  }

  .wizard-title {
    font-size: var(--vipr-font-size-title);
  }

  .wizard-body {
    font-size: var(--vipr-font-size-section-title);
  }

  .wizard-actions,
  .wizard-footer {
    padding-top: var(--vipr-wizard-actions-top-space-mobile);
  }

  .wizard-footer {
    align-items: stretch;
  }

  .federation-card {
    width: 148px;
    height: 108px;
    font-size: var(--vipr-font-size-caption);
  }
}
</style>
