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

      <div class="receive-onchain-content">
        <FederationSelector
          class="receive-onchain-federation-selector"
          :class="{ 'receive-onchain-federation-selector--qr': bitcoinAddress !== '' }"
          :selectable="canSelectFederation"
          test-id-prefix="receive-onchain-federation"
        />

        <div v-if="!bitcoinAddress && !isGenerating" class="receive-onchain-start vipr-flow-panel">
          <q-btn
            label="Create Bitcoin address"
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
import type { WalletDepositState } from '@fedimint/core'
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

let depositPollTimeout: ReturnType<typeof setTimeout> | null = null

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
  stopDepositPolling()
})

function stopDepositPolling() {
  if (depositPollTimeout != null) {
    clearTimeout(depositPollTimeout)
    depositPollTimeout = null
  }
}

async function completeDeposit(amountSats: number) {
  if (hasCompletedDeposit.value) {
    return
  }

  hasCompletedDeposit.value = true
  isWaitingForDeposit.value = false
  stopDepositPolling()
  await walletStore.updateBalance()
  await router.push({
    name: '/received-lightning',
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

function scheduleDepositPoll() {
  stopDepositPolling()
  depositPollTimeout = setTimeout(() => {
    pollDepositState().catch((error: unknown) => {
      logger.error('Failed polling onchain deposit state', error)
    })
  }, 5000)
}

async function pollDepositState() {
  if (operationId.value === '' || hasCompletedDeposit.value) {
    return
  }

  try {
    const operation = await walletStore.wallet?.federation.getOperation(operationId.value)
    const nextState = normalizeDepositState(operation?.outcome?.outcome)

    if (nextState != null) {
      depositState.value = nextState
      logger.logTransaction('Deposit state update', { state: nextState })
    }

    if (nextState != null && typeof nextState === 'object' && 'Confirmed' in nextState) {
      await completeDeposit(nextState.Confirmed.btc_deposited)
      return
    }

    if (nextState != null && typeof nextState === 'object' && 'Claimed' in nextState) {
      await completeDeposit(nextState.Claimed.btc_deposited)
      return
    }

    if (nextState != null && typeof nextState === 'object' && 'Failed' in nextState) {
      isWaitingForDeposit.value = false
      stopDepositPolling()
      notify.error(`Deposit monitoring failed: ${nextState.Failed}`)
      return
    }

    scheduleDepositPoll()
  } catch (error) {
    logger.error('Error polling deposit state', error)
    scheduleDepositPoll()
  }
}

function startDepositPolling() {
  if (operationId.value === '') {
    return
  }

  isWaitingForDeposit.value = true
  depositState.value = 'WaitingForTransaction'
  pollDepositState().catch((error: unknown) => {
    logger.error('Failed to start onchain deposit polling', error)
  })
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

    startDepositPolling()
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
  stopDepositPolling()
  await router.push({ name: '/' })
}
</script>

<style scoped>
.receive-onchain-content {
  box-sizing: border-box;
  width: 100%;
  padding: var(--vipr-space-0) var(--vipr-space-4) var(--vipr-space-6);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.receive-onchain-generating {
  padding: var(--vipr-space-8);
  text-align: center;
}

.receive-onchain-federation-selector,
.receive-onchain-start {
  width: 100%;
  max-width: var(--vipr-width-flow-panel);
}

.receive-onchain-federation-selector {
  margin-bottom: var(--vipr-space-3);
}

.receive-onchain-federation-selector--qr {
  max-width: 600px;
}

.receive-onchain-start {
  display: flex;
  justify-content: center;
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
