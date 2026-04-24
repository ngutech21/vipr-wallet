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
    <q-page class="column dark-gradient receive-onchain-page" data-testid="receive-onchain-page">
      <div class="receive-onchain-topbar">
        <q-btn
          flat
          round
          icon="arrow_back"
          @click="goBack"
          class="receive-onchain-topbar__back"
          data-testid="receive-onchain-back-btn"
        />
      </div>

      <div class="receive-onchain-content">
        <div v-if="isGenerating" class="amount-entry-container task-card text-center q-pa-xl">
          <q-spinner color="primary" size="3em" />
          <div class="section-title q-mt-md">Generating Bitcoin address...</div>
        </div>

        <template v-else>
          <div class="qr-card-shell">
            <q-card v-if="bitcoinAddress" flat class="task-card qr-card">
              <q-card-section class="qr-container">
                <div class="qr-surface">
                  <qrcode-vue
                    :value="bitcoinAddress"
                    level="M"
                    render-as="svg"
                    :size="0"
                    class="responsive-qr"
                  />
                </div>
              </q-card-section>
              <q-separator class="qr-separator" />
              <q-card-section class="address-section">
                <div class="address-row">
                  <input
                    class="address-label"
                    :title="bitcoinAddress"
                    :value="bitcoinAddress"
                    readonly
                    data-testid="receive-onchain-address-input"
                    aria-label="Bitcoin address"
                  />
                  <q-btn
                    icon="content_copy"
                    flat
                    round
                    @click="copyToClipboard"
                    data-testid="receive-onchain-copy-btn"
                  />
                  <q-btn
                    icon="share"
                    flat
                    round
                    @click="shareAddress"
                    data-testid="receive-onchain-share-btn"
                  />
                </div>
              </q-card-section>
            </q-card>
          </div>

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

import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useShare } from '@vueuse/core'
import QrcodeVue from 'qrcode.vue'
import type { WalletDepositState } from '@fedimint/core'
import { useAppNotify } from 'src/composables/useAppNotify'
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
const { share, isSupported } = useShare()
const notify = useAppNotify()

let depositPollTimeout: ReturnType<typeof setTimeout> | null = null

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

onMounted(async () => {
  await generateAddress()
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
  if (federationStore.selectedFederation == null) {
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

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(bitcoinAddress.value)
    notify.success('Address copied to clipboard', { timeout: 1000 })
  } catch (error) {
    logger.error('Failed to copy onchain address to clipboard', error)
  }
}

async function shareAddress() {
  logger.ui.debug('Sharing Bitcoin address')
  if (!isSupported.value) {
    await navigator.clipboard.writeText(bitcoinAddress.value)
    notify.info('Address copied. Share is not available in this browser.')
    return
  }

  await share({
    title: 'Bitcoin address',
    text: bitcoinAddress.value,
  })
}

async function goBack() {
  stopDepositPolling()
  await router.push({ name: '/' })
}
</script>

<style scoped>
.receive-onchain-page {
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
}

.receive-onchain-topbar {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: calc(12px + env(safe-area-inset-top)) 16px 4px;
}

.receive-onchain-topbar__back {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.receive-onchain-content {
  box-sizing: border-box;
  width: 100%;
  padding: 0 16px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.amount-entry-container {
  width: 100%;
  max-width: 560px;
}

.qr-card-shell {
  width: 100%;
  max-width: 600px;
  display: flex;
  justify-content: center;
}

.qr-card {
  width: 100%;
  margin-bottom: 14px;
  overflow: hidden;
}

.qr-container {
  box-sizing: border-box;
  width: 100%;
  aspect-ratio: 1;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-surface {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 4px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.responsive-qr {
  display: block;
  width: 100%;
  height: 100%;
}

.task-card {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.022)),
    rgba(15, 16, 22, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.075);
  border-radius: 24px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035);
}

.qr-separator {
  background: rgba(255, 255, 255, 0.075);
}

.address-section {
  padding: 12px 16px 14px;
}

.address-row {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.address-label {
  min-width: 0;
  flex: 1;
  min-height: 44px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  background-color: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.055);
  border-radius: 14px;
  color: white;
  font-size: 0.95rem;
  line-height: 1;
  font: inherit;
  outline: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.address-row :deep(.q-btn) {
  flex: 0 0 auto;
  color: rgba(255, 255, 255, 0.78);
}

.receive-onchain-status {
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-top: 18px;
  color: white;
  text-align: center;
}

.section-title {
  font-size: 1.05rem;
  font-weight: 600;
}

.status-title {
  font-size: 1.05rem;
  font-weight: 700;
}

.status-copy {
  max-width: 480px;
  color: rgba(255, 255, 255, 0.62);
  font-size: 0.92rem;
  line-height: 1.45;
}

.confirmation-info {
  margin-bottom: 6px;
  color: rgba(255, 255, 255, 0.74);
}

.status-helper {
  color: rgba(255, 255, 255, 0.62);
}

@media (max-width: 520px) {
  .receive-onchain-content {
    padding-right: 12px;
    padding-left: 12px;
  }

  .qr-container {
    padding: 6px;
  }

  .qr-surface {
    padding: 3px;
    border-radius: 14px;
  }

  .address-section {
    padding: 10px 10px 12px;
  }

  .address-row {
    gap: 4px;
  }

  .address-label {
    min-height: 40px;
    padding: 0 12px;
    font-size: 0.86rem;
  }

  .address-row :deep(.q-btn) {
    width: 40px;
    min-width: 40px;
    height: 40px;
  }

  .status-copy {
    font-size: 0.88rem;
  }
}
</style>
