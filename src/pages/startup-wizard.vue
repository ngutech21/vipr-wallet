<route lang="yaml">
meta:
  hideBottomNav: true
</route>

<template>
  <q-page class="dark-gradient q-pa-md" data-testid="startup-wizard-page">
    <div class="wizard-container">
      <q-card flat bordered class="wizard-card">
        <q-card-section>
          <div class="text-h5 text-center q-mb-xs">Vipr Wallet Setup</div>
          <div class="text-caption text-grey-6 text-center q-mb-md">
            Set up a new wallet or restore one from your recovery words.
          </div>

          <q-stepper v-model="currentStep" animated flat color="primary" class="wizard-stepper">
            <q-step
              v-if="showInstallStep"
              name="install"
              title="Install App"
              icon="home"
              :done="currentStep !== 'install'"
              :header-nav="false"
            >
              <StartupWizardInstallStep
                :install-hint-description="installHintDescription"
                :install-instruction="installInstruction"
                :needs-native-browser="needsNativeBrowser"
                :recommended-browser-label="recommendedBrowserLabel"
                @continue="continueFromInstall"
              />
            </q-step>

            <q-step
              name="choice"
              title="Get Started"
              icon="account_balance_wallet"
              :done="currentStep === 'backup' || currentStep === 'restore'"
              :header-nav="false"
            >
              <StartupWizardChoiceStep
                v-model:selected-flow="selectedFlow"
                :can-proceed-from-choice="canProceedFromChoice"
                :is-creating="isCreating"
                :is-create-locked="isCreateLocked"
                :is-restoring="isRestoring"
                @next="goFromChoiceNext"
              />
            </q-step>

            <q-step
              name="backup"
              title="Backup Words"
              icon="shield"
              :done="false"
              :header-nav="false"
            >
              <StartupWizardBackupStep
                :mnemonic-words="mnemonicWords"
                @back="backFromBackupToChoice"
                @confirm="confirmBackupAndFinish"
              />
            </q-step>

            <q-step
              name="restore"
              title="Restore Wallet"
              icon="settings_backup_restore"
              :done="false"
              :header-nav="false"
            >
              <StartupWizardRestoreStep
                v-model:restore-words="restoreWords"
                :is-creating="isCreating"
                :is-restoring="isRestoring"
                @back="backFromRestoreToChoice"
                @submit="submitRestore"
              />
            </q-step>
          </q-stepper>
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
import StartupWizardChoiceStep from 'src/components/startup-wizard/StartupWizardChoiceStep.vue'
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
  canProceedFromChoice,
  currentStep,
  isCreating,
  isCreateLocked,
  isRestoring,
  mnemonicWords,
  restoreWords,
  selectedFlow,
  backFromBackupToChoice,
  backFromRestoreToChoice,
  confirmBackupAndFinish,
  continueFromInstall,
  goFromChoiceNext,
  initializeWizard,
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
.wizard-container {
  max-width: 760px;
  margin: 0 auto;
}

.wizard-card {
  border-radius: 14px;
}

.wizard-stepper {
  background: transparent;
}
</style>
