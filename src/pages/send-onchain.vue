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
    <q-page class="column dark-gradient send-onchain-page" data-testid="send-onchain-page">
      <div class="send-onchain-topbar">
        <q-btn
          flat
          round
          icon="arrow_back"
          @click="goBack"
          class="send-onchain-topbar__back"
          data-testid="send-onchain-back-btn"
        />
      </div>

      <div class="send-onchain-content">
        <div class="flex flex-center full-width">
          <div class="amount-entry-container q-pa-lg task-card">
            <div class="section-title q-mb-md text-center">Bitcoin destination</div>

            <q-input
              v-model="paymentTarget"
              filled
              autogrow
              dense
              dark
              type="textarea"
              label="Bitcoin address or bitcoin: URI"
              class="custom-input q-mb-md"
              :error="addressError != null"
              :error-message="addressError ?? undefined"
              data-testid="send-onchain-target-input"
            >
              <template #after>
                <q-btn
                  round
                  dense
                  flat
                  icon="qr_code_scanner"
                  @click="openScanner"
                  data-testid="send-onchain-open-scanner-btn"
                />
              </template>
            </q-input>

            <q-card
              v-if="bitcoinUriDetails.length > 0"
              flat
              class="task-card task-card--secondary q-mb-md"
              data-testid="send-onchain-uri-details"
            >
              <q-card-section class="q-py-sm">
                <div
                  v-for="detail in bitcoinUriDetails"
                  :key="detail"
                  class="text-caption text-grey-5 q-mb-xs"
                >
                  {{ detail }}
                </div>
              </q-card-section>
            </q-card>

            <q-input
              filled
              v-model.number="amount"
              label="Amount (Sats)"
              type="number"
              readonly
              class="no-spinner custom-input q-mb-md"
              :error="amountError != null"
              :error-message="amountError ?? undefined"
              data-testid="send-onchain-amount-input"
            />

            <NumericKeypad class="q-mb-md" :buttons="keypadButtons" />

            <div
              v-if="uriAmountHint"
              class="text-caption text-grey q-mb-md"
              data-testid="send-onchain-uri-amount-hint"
            >
              {{ uriAmountHint }}
            </div>

            <div class="text-caption text-grey q-mb-lg" data-testid="send-onchain-max-amount">
              <template v-if="selectedFederation != null">
                Maximum spendable after fee reserve: {{ maxSendAmount.toLocaleString() }} sats
              </template>
              <template v-else> Select a federation before sending Bitcoin onchain </template>
            </div>

            <div class="text-caption text-grey q-mb-lg">
              A {{ ONCHAIN_FEE_RESERVE_SATS.toLocaleString() }} sat fee reserve is kept for network
              fees. Minimum onchain send: {{ MIN_ONCHAIN_SEND_SATS.toLocaleString() }}
              sats.
            </div>

            <q-btn
              label="Send Bitcoin"
              color="primary"
              class="full-width send-onchain-action-btn"
              :loading="isProcessing"
              :disable="!canSendOnchain"
              @click="submitOnchainPayment"
              data-testid="send-onchain-submit-btn"
              :data-busy="isProcessing ? 'true' : 'false'"
            >
              <template #loading>
                <q-spinner-dots color="white" />
              </template>
            </q-btn>
          </div>
        </div>
      </div>
    </q-page>
  </transition>
</template>

<script setup lang="ts">
defineOptions({
  name: 'SendOnchainPage',
})

import { computed, ref, watch } from 'vue'
import { Loading } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import NumericKeypad from 'src/components/NumericKeypad.vue'
import { useAppNotify } from 'src/composables/useAppNotify'
import { useNumericInput } from 'src/composables/useNumericInput'
import { logger } from 'src/services/logger'
import { useFederationStore } from 'src/stores/federation'
import { useWalletStore } from 'src/stores/wallet'
import { getErrorMessage } from 'src/utils/error'
import { parseBitcoinInput, type ParsedBitcoinInput } from 'src/utils/bitcoinUri'
import {
  getMaxOnchainSendAmount,
  MIN_ONCHAIN_SEND_SATS,
  ONCHAIN_FEE_RESERVE_SATS,
} from 'src/utils/onchainPolicy'

const router = useRouter()
const route = useRoute()
const federationStore = useFederationStore()
const walletStore = useWalletStore()
const notify = useAppNotify()

const paymentTarget = ref('')
const isProcessing = ref(false)
const { value: amount, keypadButtons, setValue } = useNumericInput(0)

const selectedFederation = computed(() => federationStore.selectedFederation)
const maxSendAmount = computed(() => getMaxOnchainSendAmount(walletStore.balance))

const parsedTarget = computed(() => safeParseBitcoinInput(paymentTarget.value))

const addressError = computed(() => {
  if (paymentTarget.value.trim() === '') {
    return null
  }

  return parsedTarget.value.error
})

const effectiveAmount = computed(() => {
  if (Number.isInteger(amount.value) && amount.value > 0) {
    return amount.value
  }

  return parsedTarget.value.data?.amountSats ?? 0
})

const amountError = computed(() => {
  if (selectedFederation.value == null) {
    return 'Select a federation before sending Bitcoin onchain'
  }

  if (addressError.value != null) {
    return null
  }

  if (paymentTarget.value.trim() === '') {
    return null
  }

  if (!Number.isInteger(effectiveAmount.value) || effectiveAmount.value <= 0) {
    return 'Enter a positive amount in sats'
  }

  if (effectiveAmount.value < MIN_ONCHAIN_SEND_SATS) {
    return `Amount must be at least ${MIN_ONCHAIN_SEND_SATS.toLocaleString()} sats`
  }

  if (Math.floor(walletStore.balance) <= ONCHAIN_FEE_RESERVE_SATS) {
    return `Keep at least ${ONCHAIN_FEE_RESERVE_SATS.toLocaleString()} sats reserved for network fees`
  }

  if (maxSendAmount.value <= 0) {
    return 'No spendable balance available after reserving network fees'
  }

  if (effectiveAmount.value > maxSendAmount.value) {
    return `Amount must be ${maxSendAmount.value.toLocaleString()} sats or less`
  }

  return null
})

const canSendOnchain = computed(() => {
  return (
    selectedFederation.value != null &&
    parsedTarget.value.data != null &&
    amountError.value == null &&
    !isProcessing.value
  )
})

const uriAmountHint = computed(() => {
  if (amount.value > 0 || parsedTarget.value.data?.amountSats == null) {
    return ''
  }

  return `Using ${parsedTarget.value.data.amountSats.toLocaleString()} sats from the Bitcoin URI`
})

const bitcoinUriDetails = computed(() => {
  const details: string[] = []
  const data = parsedTarget.value.data

  if (data?.label != null) {
    details.push(`Label: ${data.label}`)
  }

  if (data?.message != null) {
    details.push(`Message: ${data.message}`)
  }

  return details
})

watch(
  () => route.query.target,
  (newTarget) => {
    const target = Array.isArray(newTarget) ? newTarget[0] : newTarget

    if (typeof target !== 'string' || target.trim() === '') {
      return
    }

    paymentTarget.value = target

    const parsed = safeParseBitcoinInput(target)
    if (parsed.data?.amountSats != null) {
      setValue(parsed.data.amountSats)
    }
  },
  { immediate: true },
)

async function submitOnchainPayment() {
  if (!canSendOnchain.value || parsedTarget.value.data == null) {
    return
  }

  try {
    isProcessing.value = true
    Loading.show({ message: 'Submitting onchain transfer...' })

    const result = await walletStore.sendOnchain(
      parsedTarget.value.data.address,
      effectiveAmount.value,
      {
        requestedAmountSats: effectiveAmount.value,
        requestedAmountMsats: effectiveAmount.value * 1_000,
      },
    )

    await router.push({
      path: '/sent-onchain',
      query: {
        operationId: result.operationId,
        address: parsedTarget.value.data.address,
        amount: effectiveAmount.value.toString(),
      },
    })
  } catch (error) {
    logger.error('Failed to submit onchain transfer', error)
    notify.error(`Failed to send Bitcoin: ${getErrorMessage(error)}`)
  } finally {
    isProcessing.value = false
    Loading.hide()
  }
}

async function openScanner() {
  await router.push({ name: '/scan' })
}

async function goBack() {
  await router.push({ name: '/' })
}

function safeParseBitcoinInput(input: string): {
  data: ParsedBitcoinInput | null
  error: string | null
} {
  try {
    return {
      data: parseBitcoinInput(input),
      error: null,
    }
  } catch (error) {
    return {
      data: null,
      error: input.trim() === '' ? null : getErrorMessage(error),
    }
  }
}
</script>

<style scoped>
.send-onchain-page {
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
}

.send-onchain-topbar {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 12px 16px 4px;
}

.send-onchain-topbar__back {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.send-onchain-content {
  width: 100%;
  padding: 0 16px 24px;
}

.amount-entry-container {
  width: 100%;
  max-width: 560px;
}

.task-card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.025));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
}

.task-card--secondary {
  border-radius: 18px;
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

.send-onchain-action-btn {
  min-height: 54px;
  border-radius: 18px;
}
</style>

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
</style>
