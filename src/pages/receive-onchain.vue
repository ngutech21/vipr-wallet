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
    <q-page class="dark-gradient">
      <q-toolbar class="header-section">
        <q-btn flat round icon="arrow_back" @click="goBack" />
        <q-toolbar-title class="text-center no-wrap">Receive Onchain</q-toolbar-title>
        <div class="q-ml-md" style="width: 40px"></div>
      </q-toolbar>

      <!-- Loading State -->
      <div v-if="isGenerating" class="flex flex-center full-width q-mt-xl">
        <q-spinner color="primary" size="3em" />
        <div class="q-mt-md text-h6">Generating Bitcoin Address...</div>
      </div>

      <!-- QR Code Card -->
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
              <q-input v-model="bitcoinAddress" readonly class="col" dense />
              <q-btn icon="content_copy" flat @click="copyToClipboard" />
              <q-btn icon="share" flat @click="shareAddress" v-if="isSupported" />
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Deposit Status -->
      <div v-if="bitcoinAddress" class="column items-center justify-center q-mt-md q-px-md">
        <q-card flat class="glass-effect full-width" style="max-width: 512px">
          <q-card-section>
            <div class="text-center">
              <div class="text-h6 q-mb-sm">
                {{ depositStatusText }}
                <q-spinner v-if="isWaitingForDeposit" size="20px" class="q-ml-sm" />
              </div>
              <div v-if="confirmationInfo" class="text-caption text-grey-7">
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

import { ref, onMounted, computed, onUnmounted } from 'vue'
import QrcodeVue from 'qrcode.vue'
import { useWalletStore } from 'src/stores/wallet'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { useShare } from '@vueuse/core'
import { useFederationStore } from 'src/stores/federation'
import { logger } from 'src/services/logger'
import type { WalletDepositState } from '@fedimint/core'

const bitcoinAddress = ref('')
const operationId = ref('')
const isGenerating = ref(false)
const store = useWalletStore()
const $q = useQuasar()
const router = useRouter()
const isWaitingForDeposit = ref(false)
const depositState = ref<WalletDepositState | null>(null)
const { share, isSupported } = useShare()
const federationStore = useFederationStore()
let unsubscribeDeposit: (() => void) | null = null

const depositStatusText = computed(() => {
  if (depositState.value === null) {
    return 'Waiting for Bitcoin deposit...'
  }

  if (depositState.value === 'WaitingForTransaction') {
    return 'Waiting for Bitcoin deposit...'
  }

  if (typeof depositState.value === 'object' && 'WaitingForConfirmation' in depositState.value) {
    return 'Transaction detected! Waiting for confirmations...'
  }

  if (typeof depositState.value === 'object' && 'Confirmed' in depositState.value) {
    return 'Deposit confirmed!'
  }

  return 'Processing deposit...'
})

const confirmationInfo = computed(() => {
  if (
    depositState.value !== null &&
    typeof depositState.value === 'object' &&
    'WaitingForConfirmation' in depositState.value
  ) {
    const btcDeposited = depositState.value.WaitingForConfirmation.btc_deposited
    return `Received ${btcDeposited} sats - confirming...`
  }
  return ''
})

onMounted(async () => {
  await generateAddress()
})

onUnmounted(() => {
  if (unsubscribeDeposit !== null) {
    unsubscribeDeposit()
  }
})

async function generateAddress() {
  if (federationStore.selectedFederation === null) {
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

    const response = await store.wallet?.wallet.generateAddress()

    if (response !== undefined) {
      bitcoinAddress.value = response.deposit_address
      operationId.value = response.operation_id
      logger.logTransaction('Onchain address generated successfully', {
        address: response.deposit_address,
      })

      // Start monitoring for deposits
      //startDepositSubscription()
    }
  } catch (error) {
    let errorMessage = 'An unknown error occurred.'
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    }
    logger.error('Failed to generate onchain address', error)
    $q.notify({
      message: `Error generating address: ${errorMessage}`,
      color: 'negative',
      position: 'top',
    })
  } finally {
    isGenerating.value = false
  }
}

function _startDepositSubscription() {
  if (operationId.value === '') return

  isWaitingForDeposit.value = true
  logger.logTransaction('Subscribing to deposit updates', { operationId: operationId.value })

  const cancelFn = store.wallet?.wallet.subscribeDeposit(
    operationId.value,
    (state: WalletDepositState) => {
      logger.logTransaction('Deposit state update', { state })
      depositState.value = state

      // Check if deposit is confirmed
      if (typeof state === 'object' && 'Confirmed' in state) {
        logger.logTransaction('Deposit confirmed')
        isWaitingForDeposit.value = false

        store
          .updateBalance()
          .then(() => {
            // Extract amount from confirmed state
            const amountSats = (state as { Confirmed: { btc_deposited: number } }).Confirmed
              .btc_deposited

            // Navigate to success page
            return router.push({
              name: '/received-lightning',
              query: { amount: amountSats.toString() },
            })
          })
          .catch((err) => {
            logger.error('Error processing confirmed deposit', err)
          })
      }
    },
    (error: string) => {
      logger.error('Deposit subscription error', error)
      isWaitingForDeposit.value = false
      $q.notify({
        message: `Error monitoring deposit: ${error}`,
        color: 'negative',
        position: 'top',
      })
    },
  )

  if (cancelFn !== undefined) {
    unsubscribeDeposit = cancelFn
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
    logger.error('Failed to copy to clipboard', error)
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
  if (unsubscribeDeposit !== null) {
    unsubscribeDeposit()
  }
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
