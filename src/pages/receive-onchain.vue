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
          <q-card v-if="bitcoinAddress" flat class="task-card qr-card q-mb-md">
            <q-card-section class="qr-container">
              <qrcode-vue
                :value="bitcoinAddress"
                level="M"
                render-as="svg"
                :size="0"
                class="responsive-qr"
              />
            </q-card-section>
            <q-separator dark />
            <q-card-section>
              <div class="section-title q-mb-sm">Bitcoin address</div>
              <div class="row items-center q-gutter-sm no-wrap">
                <q-input
                  v-model="bitcoinAddress"
                  readonly
                  filled
                  dense
                  class="col custom-input"
                  data-testid="receive-onchain-address-input"
                />
                <q-btn
                  icon="content_copy"
                  flat
                  round
                  @click="copyToClipboard"
                  data-testid="receive-onchain-copy-btn"
                />
                <q-btn
                  v-if="isSupported"
                  icon="share"
                  flat
                  round
                  @click="shareAddress"
                  data-testid="receive-onchain-share-btn"
                />
              </div>
            </q-card-section>
          </q-card>

          <q-card v-if="bitcoinAddress" flat class="task-card status-card q-mb-md">
            <q-card-section class="text-center">
              <div class="section-title q-mb-sm" data-testid="receive-onchain-status-text">
                {{ depositStatusText }}
                <q-spinner v-if="isWaitingForDeposit" size="20px" class="q-ml-sm" />
              </div>
              <div
                v-if="confirmationInfo"
                class="text-caption text-grey"
                data-testid="receive-onchain-confirmation-info"
              >
                {{ confirmationInfo }}
              </div>
              <div class="text-caption text-grey q-mt-sm">
                Send any amount of Bitcoin to this address. Funds will be credited after
                confirmations.
              </div>
            </q-card-section>
          </q-card>
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
  padding: 12px 16px 4px;
}

.receive-onchain-topbar__back {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.receive-onchain-content {
  width: 100%;
  padding: 0 16px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.amount-entry-container,
.qr-card {
  width: 100%;
  max-width: 560px;
}

.qr-container {
  aspect-ratio: 1;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.responsive-qr {
  width: 100%;
  height: 100%;
}

.task-card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.025));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
}

.status-card {
  width: 100%;
  max-width: 560px;
}

.section-title {
  font-size: 1.05rem;
  font-weight: 600;
}

.custom-input :deep(.q-field__control) {
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
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
</style>
