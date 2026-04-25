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
    <q-page class="column dark-gradient vipr-mobile-page send-ecash-page">
      <div class="vipr-topbar send-ecash-topbar">
        <q-btn
          flat
          round
          icon="arrow_back"
          @click="goBack"
          class="vipr-topbar__back send-ecash-topbar__back"
          data-testid="send-ecash-back-btn"
        />
      </div>

      <div class="send-ecash-content">
        <div class="flex flex-center full-width">
          <template v-if="exportedNotes === ''">
            <div class="vipr-flow-panel q-pa-lg task-card vipr-surface-card--strong">
              <div class="section-title q-mb-md text-center">Enter amount</div>

              <AmountDisplay
                :value="formattedAmount"
                label="Amount (sats)"
                class="q-mb-lg"
                :error-message="amountError"
                data-testid="send-ecash-amount-input"
              />

              <NumericKeypad :buttons="keypadButtons" class="q-mb-md" />

              <div class="vipr-caption q-mb-lg" data-testid="send-ecash-max-amount">
                <template v-if="selectedFederation != null">
                  <div>Balance available: {{ maxOfflineAmount.toLocaleString() }} sats</div>
                  <div class="q-mt-xs">
                    Exact offline amounts depend on your current note denominations.
                  </div>
                </template>
                <template v-else> Select a federation before exporting offline ecash </template>
              </div>

              <q-btn
                label="Export ecash"
                color="primary"
                no-caps
                unelevated
                class="full-width vipr-btn vipr-btn--primary vipr-btn--lg"
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
            <q-card flat class="task-card vipr-flow-panel vipr-surface-card--strong q-mb-md">
              <q-card-section>
                <div class="section-title">Exported ecash</div>
                <div class="vipr-caption q-mt-xs">
                  Share these notes with the recipient. Anyone with the notes can redeem them.
                </div>
                <div class="vipr-caption q-mt-sm">
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
                  no-caps
                  class="vipr-btn vipr-btn--secondary vipr-btn--lg"
                  @click="goHome"
                  data-testid="send-ecash-go-home-btn"
                />
              </q-card-actions>
            </q-card>
          </template>
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
import { useShare } from '@vueuse/core'
import { useRouter } from 'vue-router'
import AmountDisplay from 'src/components/AmountDisplay.vue'
import AnimatedEcashQr from 'src/components/AnimatedEcashQr.vue'
import { useAppNotify } from 'src/composables/useAppNotify'
import NumericKeypad from 'src/components/NumericKeypad.vue'
import { useNumericInput } from 'src/composables/useNumericInput'
import { useFederationStore } from 'src/stores/federation'
import { useWalletStore } from 'src/stores/wallet'
import { getErrorMessage } from 'src/utils/error'

const router = useRouter()
const federationStore = useFederationStore()
const walletStore = useWalletStore()
const { share, isSupported } = useShare()
const notify = useAppNotify()

const { value: amount, keypadButtons, clear } = useNumericInput(0)
const formattedAmount = computed(() => amount.value.toLocaleString())
const exportedNotes = ref('')
const exportedAmount = ref(0)
const isProcessing = ref(false)
const offlineNoteCounts = ref<Record<number, number> | null>(null)

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
  try {
    await navigator.clipboard.writeText(exportedNotes.value)
    notify.notify({
      type: 'positive',
      message: 'Ecash copied to clipboard',
    })
  } catch (error) {
    notify.notify({
      type: 'negative',
      message: `Failed to copy ecash: ${getErrorMessage(error)}`,
    })
  }
}

async function shareNotes() {
  await share({
    title: `Ecash for ${exportedAmount.value} sats`,
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
.send-ecash-content {
  width: 100%;
  padding: var(--vipr-space-0) var(--vipr-space-4) var(--vipr-space-6);
}
</style>
