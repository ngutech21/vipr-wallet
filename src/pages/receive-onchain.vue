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
    <q-page class="dark-gradient" data-testid="receive-onchain-page">
      <q-toolbar class="header-section">
        <q-btn
          flat
          round
          icon="arrow_back"
          @click="goBack"
          data-testid="receive-onchain-back-btn"
        />
        <q-toolbar-title class="text-center no-wrap">Receive Onchain</q-toolbar-title>
        <div class="q-ml-md" style="width: 40px"></div>
      </q-toolbar>

      <div v-if="isGenerating" class="flex flex-center full-width q-mt-xl">
        <q-spinner color="primary" size="3em" />
        <div class="q-mt-md text-h6">Generating Bitcoin Address...</div>
      </div>

      <div v-else class="column items-center justify-center">
        <q-card v-if="bitcoinAddress" class="qr-card">
          <q-card-section class="qr-container">
            <qrcode-vue
              :value="bitcoinAddress"
              level="M"
              render-as="svg"
              :size="0"
              class="responsive-qr"
            />
          </q-card-section>
          <q-separator />
          <q-card-section>
            <div class="text-caption text-grey-7 q-mb-sm">Bitcoin Address</div>
            <div class="row items-center q-gutter-sm">
              <q-input
                v-model="bitcoinAddress"
                readonly
                class="col"
                dense
                data-testid="receive-onchain-address-input"
              />
              <q-btn
                icon="content_copy"
                flat
                @click="copyToClipboard"
                data-testid="receive-onchain-copy-btn"
              />
              <q-btn
                v-if="isSupported"
                icon="share"
                flat
                @click="shareAddress"
                data-testid="receive-onchain-share-btn"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div v-if="bitcoinAddress" class="column items-center justify-center q-mt-md q-px-md">
        <q-card flat class="glass-effect full-width" style="max-width: 512px">
          <q-card-section>
            <div class="text-center">
              <div class="text-h6 q-mb-sm" data-testid="receive-onchain-status-text">
                {{ depositStatusText }}
                <q-spinner v-if="isWaitingForDeposit" size="20px" class="q-ml-sm" />
              </div>
              <div
                v-if="confirmationInfo"
                class="text-caption text-grey-7"
                data-testid="receive-onchain-confirmation-info"
              >
                {{ confirmationInfo }}
              </div>
            </div>
          </q-card-section>
        </q-card>

        <div class="q-mt-md text-caption text-grey-7 text-center">
          Send any amount of Bitcoin to this address.<br />
          Funds will be credited after confirmations.
        </div>
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
import { useQuasar } from 'quasar'
import { useShare } from '@vueuse/core'
import QrcodeVue from 'qrcode.vue'
import type { WalletDepositState } from '@fedimint/core'
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
const $q = useQuasar()
const { share, isSupported } = useShare()

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
      $q.notify({
        message: `Deposit monitoring failed: ${nextState.Failed}`,
        color: 'negative',
        position: 'top',
      })
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
    $q.notify({
      message: 'No federation selected',
      color: 'negative',
      position: 'top',
    })
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
    $q.notify({
      message: `Error generating address: ${getErrorMessage(error)}`,
      color: 'negative',
      position: 'top',
    })
  } finally {
    isGenerating.value = false
  }
}

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(bitcoinAddress.value)
    $q.notify({
      message: 'Address copied to clipboard',
      color: 'positive',
      position: 'top',
      timeout: 1000,
    })
  } catch (error) {
    logger.error('Failed to copy onchain address to clipboard', error)
  }
}

async function shareAddress() {
  logger.ui.debug('Sharing Bitcoin address')
  await share({
    title: 'Bitcoin Address',
    text: bitcoinAddress.value,
  })
}

async function goBack() {
  stopDepositPolling()
  await router.push({ name: '/' })
}
</script>

<style scoped>
.qr-card {
  width: 100%;
  max-width: 512px;
  margin-bottom: 0;
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

.glass-effect {
  background-color: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  border-radius: 16px;
}
</style>
