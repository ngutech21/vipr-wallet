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
    <q-page
      class="dark-gradient vipr-mobile-page receive-onchain-page"
      data-testid="receive-onchain-page"
    >
      <ViprTopbar
        topbar-class="receive-onchain-topbar"
        button-class="receive-onchain-topbar__back"
        button-test-id="receive-onchain-back-btn"
        @back="goBack"
      />

      <div class="receive-onchain-content vipr-flow-content">
        <FederationSelector
          class="receive-onchain-federation-selector"
          :class="{ 'receive-onchain-federation-selector--qr': bitcoinAddress !== '' }"
          :selectable="canSelectFederation"
          test-id-prefix="receive-onchain-federation"
        />

        <div
          v-if="!bitcoinAddress && !isGenerating"
          class="receive-onchain-start vipr-flow-bottom-action"
        >
          <div class="vipr-flow-bottom-hint">
            Creates a Bitcoin deposit address for this federation.
          </div>
          <q-btn
            label="Create Bitcoin address"
            icon="currency_bitcoin"
            color="primary"
            no-caps
            unelevated
            class="vipr-flow-action vipr-btn vipr-btn--primary vipr-btn--lg"
            :disable="!canGenerateAddress"
            @click="generateAddress"
            data-testid="receive-onchain-generate-address-btn"
            :data-busy="isGenerating ? 'true' : 'false'"
          />
        </div>

        <div
          v-else-if="isGenerating"
          class="receive-onchain-generating vipr-flow-panel task-card vipr-surface-card--strong"
        >
          <q-spinner color="primary" size="3em" />
          <div class="section-title receive-onchain-generating__title">
            Generating Bitcoin address...
          </div>
        </div>

        <template v-else>
          <CopyableQrCard
            v-if="bitcoinAddress"
            :value="bitcoinAddress"
            input-aria-label="Bitcoin address"
            test-id-prefix="receive-onchain"
            input-test-id="receive-onchain-address-input"
            copy-test-id="receive-onchain-copy-btn"
            share-test-id="receive-onchain-share-btn"
            @copy="copyToClipboard"
            @share="shareAddress"
          />

          <div v-if="bitcoinAddress" class="receive-onchain-status">
            <div class="status-title" data-testid="receive-onchain-status-text">
              {{ depositStatusText }}
            </div>
            <div class="status-copy">
              <div
                v-if="confirmationInfo"
                class="confirmation-info"
                data-testid="receive-onchain-confirmation-info"
              >
                {{ confirmationInfo }}
              </div>
              <div class="status-helper">
                Send any amount of Bitcoin to this address. Funds will be credited after
                confirmations.
              </div>
            </div>
          </div>
        </template>
      </div>
    </q-page>
  </transition>
</template>

<script setup lang="ts">
defineOptions({
  name: 'ReceiveOnchainPage',
})

import { computed, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { CancelFunction, WalletDepositState } from '@fedimint/core'
import CopyableQrCard from 'src/components/CopyableQrCard.vue'
import FederationSelector from 'src/components/FederationSelector.vue'
import ViprTopbar from 'src/components/ViprTopbar.vue'
import { useAppNotify } from 'src/composables/useAppNotify'
import { useCopyShare } from 'src/composables/useCopyShare'
import { useFederationStore } from 'src/stores/federation'
import { logger } from 'src/services/logger'
import { useWalletStore } from 'src/stores/wallet'
import { getErrorMessage } from 'src/utils/error'

const bitcoinAddress = ref('')
const operationId = ref('')
const isGenerating = ref(false)
const isWaitingForDeposit = ref(false)
const depositState = ref<WalletDepositState | null>(null)
const hasCompletedDeposit = ref(false)

const walletStore = useWalletStore()
const federationStore = useFederationStore()
const router = useRouter()
const notify = useAppNotify()
const { copyToClipboard, shareValue: shareBitcoinAddress } = useCopyShare({
  value: bitcoinAddress,
  copySuccessMessage: 'Address copied to clipboard',
  copySuccessOptions: { timeout: 1000 },
  shareTitle: 'Bitcoin address',
  shareUnavailableMessage: 'Address copied. Share is not available in this browser.',
  onCopyError: (error) => logger.error('Failed to copy onchain address to clipboard', error),
})

let unsubscribeDepositWait: CancelFunction | null = null

const selectedFederation = computed(() => federationStore.selectedFederation)
const canSelectFederation = computed(() => bitcoinAddress.value === '' && !isGenerating.value)
const canGenerateAddress = computed(() => selectedFederation.value != null && !isGenerating.value)

const depositStatusText = computed(() => {
  if (depositState.value === null || depositState.value === 'WaitingForTransaction') {
    return 'Waiting for Bitcoin'
  }

  if (typeof depositState.value === 'object' && 'WaitingForConfirmation' in depositState.value) {
    return 'Transaction detected'
  }

  if (typeof depositState.value === 'object' && 'Confirmed' in depositState.value) {
    return 'Bitcoin received'
  }

  if (typeof depositState.value === 'object' && 'Claimed' in depositState.value) {
    return 'Bitcoin received'
  }

  if (typeof depositState.value === 'object' && 'Failed' in depositState.value) {
    return 'Deposit failed'
  }

  return 'Processing deposit...'
})

const confirmationInfo = computed(() => {
  if (
    depositState.value != null &&
    typeof depositState.value === 'object' &&
    'WaitingForConfirmation' in depositState.value
  ) {
    return `Received ${depositState.value.WaitingForConfirmation.btc_deposited} sats - confirming...`
  }

  if (
    depositState.value != null &&
    typeof depositState.value === 'object' &&
    'Failed' in depositState.value
  ) {
    return depositState.value.Failed
  }

  return ''
})

onUnmounted(() => {
  cleanupDepositWait()
})

function cleanupDepositWait() {
  unsubscribeDepositWait?.()
  unsubscribeDepositWait = null
  isWaitingForDeposit.value = false
}

async function completeDeposit(amountSats: number) {
  if (hasCompletedDeposit.value) {
    return
  }

  hasCompletedDeposit.value = true
  cleanupDepositWait()
  await walletStore.updateBalance()
  await router.push({
    name: '/received-onchain',
    query: { amount: amountSats.toString() },
  })
}

function normalizeDepositState(outcome: unknown): WalletDepositState | null {
  if (outcome === 'WaitingForTransaction') {
    return outcome
  }

  if (typeof outcome !== 'object' || outcome == null) {
    return null
  }

  if (
    'WaitingForConfirmation' in outcome ||
    'Confirmed' in outcome ||
    'Claimed' in outcome ||
    'Failed' in outcome
  ) {
    return outcome as WalletDepositState
  }

  return null
}

function handleDepositState(state: WalletDepositState, activeOperationId: string) {
  if (
    activeOperationId !== operationId.value ||
    hasCompletedDeposit.value ||
    normalizeDepositState(state) == null
  ) {
    return
  }

  depositState.value = state
  logger.logTransaction('Deposit state update', { state })

  if (typeof state === 'object' && 'Confirmed' in state) {
    completeDeposit(state.Confirmed.btc_deposited).catch((error: unknown) => {
      logger.error('Failed to handle confirmed onchain deposit', error)
    })
    return
  }

  if (typeof state === 'object' && 'Claimed' in state) {
    completeDeposit(state.Claimed.btc_deposited).catch((error: unknown) => {
      logger.error('Failed to handle claimed onchain deposit', error)
    })
    return
  }

  if (typeof state === 'object' && 'Failed' in state) {
    cleanupDepositWait()
    notify.error(`Deposit monitoring failed: ${state.Failed}`)
  }
}

function subscribeToDeposit() {
  if (operationId.value === '') {
    return
  }

  cleanupDepositWait()
  isWaitingForDeposit.value = true
  depositState.value = 'WaitingForTransaction'

  const activeOperationId = operationId.value
  unsubscribeDepositWait =
    walletStore.wallet?.wallet.subscribeDeposit(
      activeOperationId,
      (state) => {
        handleDepositState(state, activeOperationId)
      },
      (error) => {
        if (activeOperationId !== operationId.value) {
          return
        }

        cleanupDepositWait()
        logger.error('Onchain deposit subscription failed', {
          operationId: activeOperationId,
          error,
        })
        notify.error(`Error monitoring deposit: ${getErrorMessage(error)}`)
      },
    ) ?? null
}

async function generateAddress() {
  if (selectedFederation.value == null) {
    logger.error('No federation selected')
    notify.error('No federation selected')
    return
  }

  try {
    isGenerating.value = true
    logger.logTransaction('Generating onchain address')

    const response = await walletStore.wallet?.wallet.generateAddress()
    if (response == null) {
      throw new Error('Failed to generate onchain address')
    }

    bitcoinAddress.value = response.deposit_address
    operationId.value = response.operation_id

    logger.logTransaction('Onchain address generated successfully', {
      address: response.deposit_address,
      operationId: response.operation_id,
    })

    subscribeToDeposit()
  } catch (error) {
    logger.error('Failed to generate onchain address', error)
    notify.error(`Error generating address: ${getErrorMessage(error)}`)
  } finally {
    isGenerating.value = false
  }
}

async function shareAddress() {
  logger.ui.debug('Sharing Bitcoin address')
  await shareBitcoinAddress()
}

async function goBack() {
  cleanupDepositWait()
  await router.push({ name: '/' })
}
</script>

<style scoped>
.receive-onchain-generating {
  padding: var(--vipr-space-8);
  text-align: center;
}

.receive-onchain-federation-selector {
  width: 100%;
  max-width: var(--vipr-width-flow-panel);
}

.receive-onchain-federation-selector {
  margin-bottom: var(--vipr-space-3);
}

.receive-onchain-federation-selector--qr {
  max-width: 600px;
}

.receive-onchain-generating__title {
  margin-top: var(--vipr-space-4);
}

.receive-onchain-status {
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--vipr-space-3);
  margin-top: var(--vipr-space-4-5);
  color: var(--vipr-text-primary);
  text-align: center;
}

.status-copy {
  max-width: 480px;
}

.confirmation-info {
  margin-bottom: calc(var(--vipr-space-3) / 2);
  color: var(--vipr-text-secondary);
}

@media (max-width: 520px) {
  .receive-onchain-content {
    padding-right: var(--vipr-space-4);
    padding-left: var(--vipr-space-4);
  }
}
</style>
