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
    <q-page class="dark-gradient vipr-mobile-page send-ecash-page">
      <ViprTopbar
        topbar-class="send-ecash-topbar"
        button-class="send-ecash-topbar__back"
        button-test-id="send-ecash-back-btn"
        @back="goBack"
      />

      <div class="send-ecash-content vipr-flow-content vipr-flow-content--keypad">
        <template v-if="exportedNotes === ''">
          <FederationSelector class="send-ecash-federation-selector" />

          <div class="vipr-flow-center">
            <div
              class="vipr-flow-panel vipr-flow-panel--padded task-card vipr-surface-card--strong"
            >
              <AmountEntryGroup
                :value="formattedAmount"
                :buttons="keypadButtons"
                label="Amount (sats)"
                :error-message="amountError"
                amount-test-id="send-ecash-amount-input"
                meta-test-id="send-ecash-amount-meta"
              />
            </div>
          </div>
        </template>

        <template v-else>
          <div class="vipr-flow-center">
            <q-card
              flat
              class="task-card vipr-flow-panel vipr-surface-card--strong send-ecash-export-card"
            >
              <q-btn
                flat
                round
                icon="close"
                aria-label="Go to home"
                class="send-ecash-export-close"
                @click="goHome"
                data-testid="send-ecash-close-btn"
              />

              <q-card-section class="send-ecash-export-header">
                <div class="section-title">Exported ecash</div>
                <div class="vipr-caption send-ecash-export-copy">
                  Share these notes with the recipient. Anyone with the notes can redeem them.
                </div>
                <div class="vipr-caption send-ecash-export-amount">
                  Amount: {{ exportedAmount.toLocaleString() }} sats
                </div>
              </q-card-section>

              <q-separator dark />

              <q-card-section class="send-ecash-qr-section">
                <AnimatedEcashQr :notes="exportedNotes" data-testid="send-ecash-animated-qr" />
              </q-card-section>

              <q-card-actions class="send-ecash-actions">
                <q-btn
                  flat
                  icon="content_copy"
                  label="Copy"
                  @click="copyNotes"
                  data-testid="send-ecash-copy-btn"
                />
                <q-btn
                  v-if="isShareSupported"
                  flat
                  icon="share"
                  label="Share"
                  @click="shareNotes"
                  data-testid="send-ecash-share-btn"
                />
              </q-card-actions>
            </q-card>
          </div>
        </template>

        <div v-if="exportedNotes === ''" class="vipr-flow-bottom-action">
          <div class="vipr-flow-bottom-hint" data-testid="send-ecash-denomination-note">
            {{ sendEcashBottomHint }}
          </div>
          <q-btn
            :label="paymentFlowCopy.sendEcash.submitLabel"
            icon="arrow_upward"
            color="primary"
            no-caps
            unelevated
            class="vipr-flow-action vipr-btn vipr-btn--primary vipr-btn--lg"
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
      </div>
    </q-page>
  </transition>
</template>

<script setup lang="ts">
defineOptions({
  name: 'SendEcashPage',
})

import { computed, ref, watch } from 'vue'
import { Loading } from 'quasar'
import { useRouter } from 'vue-router'
import AmountEntryGroup from 'src/components/AmountEntryGroup.vue'
import AnimatedEcashQr from 'src/components/AnimatedEcashQr.vue'
import FederationSelector from 'src/components/FederationSelector.vue'
import ViprTopbar from 'src/components/ViprTopbar.vue'
import { useAppNotify } from 'src/composables/useAppNotify'
import { useCopyShare } from 'src/composables/useCopyShare'
import { useNumericInput } from 'src/composables/useNumericInput'
import { paymentFlowCopy } from 'src/constants/paymentFlowCopy'
import { useFederationStore } from 'src/stores/federation'
import { useWalletStore } from 'src/stores/wallet'
import { getErrorMessage } from 'src/utils/error'

const router = useRouter()
const federationStore = useFederationStore()
const walletStore = useWalletStore()
const notify = useAppNotify()

const { value: amount, keypadButtons, clear } = useNumericInput(0)
const formattedAmount = computed(() => amount.value.toLocaleString())
const exportedNotes = ref('')
const exportedAmount = ref(0)
const isProcessing = ref(false)
const offlineNoteCounts = ref<Record<number, number> | null>(null)
const {
  copyToClipboard: copyNotesToClipboard,
  shareValue: shareExportedNotes,
  isShareSupported,
} = useCopyShare({
  value: exportedNotes,
  copySuccessMessage: 'Ecash copied to clipboard',
  copyErrorMessage: (error) => `Failed to copy ecash: ${getErrorMessage(error)}`,
  shareTitle: computed(() => `Ecash for ${exportedAmount.value} sats`),
  shareUnavailableMessage: 'Ecash copied. Share is not available in this browser.',
})

const selectedFederation = computed(() => federationStore.selectedFederation)
const sendEcashBottomHint = computed(() =>
  selectedFederation.value == null
    ? paymentFlowCopy.sendEcash.selectFederationHint
    : paymentFlowCopy.sendEcash.denominationHint,
)

const maxOfflineAmount = computed(() => {
  const balanceLimit = Math.max(0, Math.floor(walletStore.balance))
  const metadataLimitMsats = selectedFederation.value?.metadata?.maxInvoiceMsats

  if (metadataLimitMsats == null) {
    return balanceLimit
  }

  if (!Number.isFinite(metadataLimitMsats) || metadataLimitMsats <= 0) {
    return balanceLimit
  }

  return Math.min(balanceLimit, Math.floor(metadataLimitMsats / 1_000))
})

const hasExactOfflineAmount = computed(() => {
  if (amount.value <= 0 || offlineNoteCounts.value == null) {
    return null
  }

  return canRepresentExactMsats(amount.value * 1_000, offlineNoteCounts.value)
})

const amountError = computed(() => {
  if (selectedFederation.value == null) {
    return 'Select a federation before exporting offline ecash'
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

  if (hasExactOfflineAmount.value === false) {
    return 'This exact amount is not available with your current offline notes'
  }

  return null
})

const canCreateOfflineEcash = computed(() => {
  return (
    selectedFederation.value != null &&
    Number.isInteger(amount.value) &&
    amount.value > 0 &&
    amount.value <= maxOfflineAmount.value &&
    hasExactOfflineAmount.value !== false &&
    !isProcessing.value
  )
})

watch(
  () => [selectedFederation.value?.federationId, walletStore.balance],
  () => {
    refreshOfflineNoteCounts()
  },
  { immediate: true },
)

async function createOfflineEcash() {
  if (!canCreateOfflineEcash.value) {
    return
  }

  try {
    isProcessing.value = true
    Loading.show({ message: 'Creating offline ecash...' })

    const result = await walletStore.spendEcashOffline(amount.value)
    exportedAmount.value = amount.value
    exportedNotes.value = result.notes
  } catch (error) {
    notify.error(getOfflineEcashErrorMessage(error))
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
  await copyNotesToClipboard()
}

async function shareNotes() {
  await shareExportedNotes()
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

async function loadOfflineNoteCounts() {
  if (selectedFederation.value == null) {
    offlineNoteCounts.value = null
    return
  }

  try {
    offlineNoteCounts.value = await walletStore.getOfflineEcashNoteCounts()
  } catch {
    offlineNoteCounts.value = null
  }
}

function refreshOfflineNoteCounts() {
  loadOfflineNoteCounts().catch(() => {
    offlineNoteCounts.value = null
  })
}

function getOfflineEcashErrorMessage(error: unknown) {
  const message = getErrorMessage(error)

  if (message.includes('Could not select notes with exact amount')) {
    return `This exact amount cannot be exported offline right now. Your balance is ${maxOfflineAmount.value.toLocaleString()} sats, but offline ecash can only use your current note denominations. Try a different amount.`
  }

  return `Failed to create offline ecash: ${message}`
}

function canRepresentExactMsats(targetMsats: number, noteCounts: Record<number, number>) {
  if (!Number.isInteger(targetMsats) || targetMsats < 0) {
    return false
  }

  const countsByBit = new Map<number, number>()

  for (const [denominationKey, countValue] of Object.entries(noteCounts)) {
    const denomination = Number.parseInt(denominationKey, 10)
    const count = Number(countValue)

    if (
      !Number.isFinite(denomination) ||
      denomination <= 0 ||
      !Number.isFinite(count) ||
      count <= 0
    ) {
      continue
    }

    const bit = Math.log2(denomination)
    if (!Number.isInteger(bit)) {
      continue
    }

    countsByBit.set(bit, (countsByBit.get(bit) ?? 0) + Math.floor(count))
  }

  if (countsByBit.size === 0) {
    return targetMsats === 0
  }

  const highestTargetBit = targetMsats === 0 ? 0 : Math.floor(Math.log2(targetMsats))
  const highestCountBit = Math.max(...countsByBit.keys())
  const highestBit = Math.max(highestTargetBit, highestCountBit)

  let carry = 0
  let remaining = targetMsats

  for (let bit = 0; bit <= highestBit; bit += 1) {
    const available = (countsByBit.get(bit) ?? 0) + carry
    const requiredBit = remaining % 2

    if (available < requiredBit) {
      return false
    }

    carry = Math.floor((available - requiredBit) / 2)
    remaining = Math.floor(remaining / 2)
  }

  return remaining === 0
}
</script>

<style scoped>
.send-ecash-federation-selector {
  width: 100%;
  max-width: var(--vipr-width-flow-panel);
  margin-bottom: var(--vipr-space-5);
}

.send-ecash-export-copy {
  margin-top: var(--vipr-space-1);
}

.send-ecash-export-amount {
  margin-top: var(--vipr-space-2);
}

.send-ecash-export-card {
  position: relative;
  margin-bottom: var(--vipr-space-4);
}

.send-ecash-export-header {
  padding-right: calc(var(--vipr-space-8) + var(--vipr-size-touch-min));
}

.send-ecash-export-close {
  position: absolute;
  top: var(--vipr-space-4);
  right: var(--vipr-space-4);
  z-index: 1;
  background: var(--vipr-color-surface-soft);
  border: 1px solid var(--vipr-color-surface-soft-border);
}

.send-ecash-qr-section {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: var(--vipr-space-6);
}

.send-ecash-actions {
  padding-right: var(--vipr-space-4);
  padding-bottom: var(--vipr-space-4);
  padding-left: var(--vipr-space-4);
}
</style>
