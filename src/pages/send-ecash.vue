<route lang="yaml">
meta:
  hideBottomNav: true
</route>

<template>
  <transition
    appear
    enter-active-class="animated slideInLeft"
    leave-active-class="animated slideOutLeft"
  >
    <q-page class="column dark-gradient">
      <q-toolbar class="header-section">
        <q-btn flat round icon="arrow_back" @click="goBack" data-testid="send-ecash-back-btn" />
        <q-toolbar-title class="text-center no-wrap">Send Offline eCash</q-toolbar-title>
        <div class="q-ml-md" style="width: 40px"></div>
      </q-toolbar>

      <div class="flex flex-center full-width">
        <template v-if="exportedNotes === ''">
          <div class="amount-entry-container q-pa-lg glass-effect">
            <div class="text-h6 q-mb-md text-center">Enter Amount</div>

            <q-input
              filled
              v-model.number="amount"
              label="Amount (Sats)"
              type="number"
              class="no-spinner q-mb-lg"
              readonly
              :error="amountError != null"
              :error-message="amountError ?? undefined"
              data-testid="send-ecash-amount-input"
            />

            <NumericKeypad :buttons="keypadButtons" class="q-mb-md" />

            <div class="text-caption text-grey q-mb-lg" data-testid="send-ecash-max-amount">
              <template v-if="selectedFederation != null">
                Maximum available to export: {{ maxOfflineAmount.toLocaleString() }} sats
              </template>
              <template v-else> Select a federation before exporting offline eCash </template>
            </div>

            <q-btn
              label="Export eCash"
              color="primary"
              class="full-width"
              :loading="isProcessing"
              :disable="!canCreateOfflineEcash"
              @click="createOfflineEcash"
              data-testid="send-ecash-create-btn"
              :data-busy="isProcessing ? 'true' : 'false'"
            >
              <template #loading>
                <q-spinner-dots color="white" />
              </template>
            </q-btn>
          </div>
        </template>

        <template v-else>
          <q-card flat class="glass-effect q-mb-md">
            <q-card-section>
              <div class="text-subtitle2">Exported eCash</div>
              <div class="text-caption text-grey q-mt-xs">
                Share these notes with the recipient. Anyone with the notes can redeem them.
              </div>
              <div class="text-caption text-grey q-mt-sm">
                Amount: {{ exportedAmount.toLocaleString() }} sats
              </div>
            </q-card-section>

            <q-separator dark />

            <q-card-section class="column items-center q-pt-lg">
              <AnimatedEcashQr :notes="exportedNotes" data-testid="send-ecash-animated-qr" />
            </q-card-section>

            <q-card-actions class="q-px-md q-pb-md">
              <q-btn
                flat
                icon="content_copy"
                label="Copy"
                @click="copyNotes"
                data-testid="send-ecash-copy-btn"
              />
              <q-btn
                v-if="isSupported"
                flat
                icon="share"
                label="Share"
                @click="shareNotes"
                data-testid="send-ecash-share-btn"
              />
              <q-space />
              <q-btn
                flat
                color="primary"
                label="Go to home"
                @click="goHome"
                data-testid="send-ecash-go-home-btn"
              />
            </q-card-actions>
          </q-card>
        </template>
      </div>
    </q-page>
  </transition>
</template>

<script setup lang="ts">
defineOptions({
  name: 'SendEcashPage',
})

import { computed, ref } from 'vue'
import { Loading, useQuasar } from 'quasar'
import { useShare } from '@vueuse/core'
import { useRouter } from 'vue-router'
import AnimatedEcashQr from 'src/components/AnimatedEcashQr.vue'
import NumericKeypad from 'src/components/NumericKeypad.vue'
import { useNumericInput } from 'src/composables/useNumericInput'
import { useFederationStore } from 'src/stores/federation'
import { useWalletStore } from 'src/stores/wallet'
import { getErrorMessage } from 'src/utils/error'

const router = useRouter()
const federationStore = useFederationStore()
const walletStore = useWalletStore()
const { share, isSupported } = useShare()
const $q = useQuasar()

const { value: amount, keypadButtons, clear } = useNumericInput(0)
const exportedNotes = ref('')
const exportedAmount = ref(0)
const isProcessing = ref(false)

const selectedFederation = computed(() => federationStore.selectedFederation)

const maxOfflineAmount = computed(() => {
  const balanceLimit = Math.max(0, Math.floor(walletStore.balance))
  const metadataLimitMsats = selectedFederation.value?.metadata?.max_invoice_msats

  if (metadataLimitMsats == null || metadataLimitMsats === '') {
    return balanceLimit
  }

  const parsedLimitMsats = Number.parseInt(metadataLimitMsats, 10)
  if (!Number.isFinite(parsedLimitMsats) || parsedLimitMsats <= 0) {
    return balanceLimit
  }

  return Math.min(balanceLimit, Math.floor(parsedLimitMsats / 1_000))
})

const amountError = computed(() => {
  if (selectedFederation.value == null) {
    return 'Select a federation before exporting offline eCash'
  }

  if (amount.value === 0) {
    return null
  }

  if (!Number.isInteger(amount.value)) {
    return 'Enter a whole number of sats'
  }

  if (amount.value <= 0) {
    return 'Enter a positive amount'
  }

  if (maxOfflineAmount.value <= 0) {
    return 'No spendable balance available'
  }

  if (amount.value > maxOfflineAmount.value) {
    return `Amount must be ${maxOfflineAmount.value.toLocaleString()} sats or less`
  }

  return null
})

const canCreateOfflineEcash = computed(() => {
  return (
    selectedFederation.value != null &&
    Number.isInteger(amount.value) &&
    amount.value > 0 &&
    amount.value <= maxOfflineAmount.value &&
    !isProcessing.value
  )
})

async function createOfflineEcash() {
  if (!canCreateOfflineEcash.value) {
    return
  }

  try {
    isProcessing.value = true
    Loading.show({ message: 'Creating offline eCash...' })

    const result = await walletStore.spendEcashOffline(amount.value)
    exportedAmount.value = amount.value
    exportedNotes.value = result.notes
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: `Failed to create offline eCash: ${getErrorMessage(error)}`,
      position: 'top',
    })
  } finally {
    isProcessing.value = false
    Loading.hide()
  }
}

async function goBack() {
  if (exportedNotes.value !== '') {
    resetExport()
    return
  }

  await router.push({ name: '/' })
}

async function copyNotes() {
  try {
    await navigator.clipboard.writeText(exportedNotes.value)
    $q.notify({
      type: 'positive',
      message: 'eCash copied to clipboard',
      position: 'top',
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: `Failed to copy eCash: ${getErrorMessage(error)}`,
      position: 'top',
    })
  }
}

async function shareNotes() {
  await share({
    title: `eCash for ${exportedAmount.value} sats`,
    text: exportedNotes.value,
  })
}

async function goHome() {
  resetExport()
  await router.push({ name: '/' })
}

function resetExport() {
  exportedNotes.value = ''
  exportedAmount.value = 0
  clear()
}
</script>

<style scoped>
.amount-entry-container {
  width: 100%;
  max-width: 500px;
  border-radius: 16px;
}

.custom-input :deep(.q-field__control) {
  background-color: rgba(255, 255, 255, 0.05);
}

.custom-input :deep(.q-field__native),
.custom-input :deep(.q-field__prefix),
.custom-input :deep(.q-field__suffix),
.custom-input :deep(.q-field__input) {
  color: white;
}

.text-grey {
  color: #9e9e9e;
}

.glass-effect {
  background-color: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  border-radius: 16px;
}
</style>
