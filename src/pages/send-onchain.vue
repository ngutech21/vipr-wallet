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
      class="dark-gradient vipr-mobile-page send-onchain-page"
      data-testid="send-onchain-page"
    >
      <ViprTopbar
        topbar-class="send-onchain-topbar"
        button-class="send-onchain-topbar__back"
        button-test-id="send-onchain-back-btn"
        @back="goBack"
      />

      <div class="send-onchain-content vipr-flow-content vipr-flow-content--keypad">
        <FederationSelector class="send-onchain-federation-selector" />

        <div class="vipr-flow-center">
          <div class="vipr-flow-panel vipr-flow-panel--padded task-card vipr-surface-card--strong">
            <q-input
              v-model="paymentTarget"
              filled
              autogrow
              dense
              dark
              type="textarea"
              label="Bitcoin address or bitcoin: URI"
              class="vipr-input vipr-flow-spacer-md"
              :error="addressError != null"
              :error-message="addressError ?? undefined"
              data-testid="send-onchain-target-input"
            >
              <template #append>
                <div class="vipr-input-actions">
                  <q-btn
                    round
                    dense
                    flat
                    icon="content_paste"
                    aria-label="Paste Bitcoin address"
                    class="vipr-input-action"
                    @click="pastePaymentTarget"
                    data-testid="send-onchain-paste-target-btn"
                  />
                  <q-btn
                    round
                    dense
                    flat
                    icon="qr_code_scanner"
                    aria-label="Scan Bitcoin address"
                    class="vipr-input-action"
                    @click="openScanner"
                    data-testid="send-onchain-open-scanner-btn"
                  />
                </div>
              </template>
            </q-input>

            <q-card
              v-if="bitcoinUriDetails.length > 0"
              flat
              class="task-card task-card--secondary vipr-flow-spacer-md"
              data-testid="send-onchain-uri-details"
            >
              <q-card-section class="send-onchain-uri-details__body">
                <div
                  v-for="detail in bitcoinUriDetails"
                  :key="detail"
                  class="vipr-caption send-onchain-uri-details__item"
                >
                  {{ detail }}
                </div>
              </q-card-section>
            </q-card>

            <AmountEntryGroup
              :value="formattedAmount"
              :buttons="keypadButtons"
              label="Amount (sats)"
              :error-message="amountError"
              :meta-text="onchainAmountMetaText"
              amount-test-id="send-onchain-amount-input"
              meta-test-id="send-onchain-amount-meta"
            />
          </div>
        </div>

        <div class="vipr-flow-bottom-action">
          <div class="vipr-flow-bottom-hint" data-testid="send-onchain-max-amount">
            {{ sendOnchainBottomHint }}
          </div>
          <q-btn
            :label="paymentFlowCopy.sendOnchain.submitLabel"
            icon="arrow_upward"
            color="primary"
            no-caps
            unelevated
            class="vipr-flow-action vipr-btn vipr-btn--primary vipr-btn--lg"
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
import AmountEntryGroup from 'src/components/AmountEntryGroup.vue'
import FederationSelector from 'src/components/FederationSelector.vue'
import ViprTopbar from 'src/components/ViprTopbar.vue'
import { useAppNotify } from 'src/composables/useAppNotify'
import { useNumericInput } from 'src/composables/useNumericInput'
import { paymentFlowCopy } from 'src/constants/paymentFlowCopy'
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
const prefilledBitcoinUri = ref<ParsedBitcoinInput | null>(null)
const isProcessing = ref(false)
const { value: amount, keypadButtons, setValue } = useNumericInput(0)
const formattedAmount = computed(() => amount.value.toLocaleString())

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
    return 'Select a federation before sending Bitcoin on-chain'
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

  return paymentFlowCopy.sendOnchain.uriAmountHint(parsedTarget.value.data.amountSats)
})
const onchainAmountMetaText = computed(() => uriAmountHint.value)
const sendOnchainBottomHint = computed(() =>
  paymentFlowCopy.sendOnchain.bottomHint(maxSendAmount.value),
)

const bitcoinUriDetails = computed(() => {
  const details: string[] = []
  const data =
    prefilledBitcoinUri.value?.address === paymentTarget.value
      ? prefilledBitcoinUri.value
      : parsedTarget.value.data

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

    const parsed = safeParseBitcoinInput(target)
    prefilledBitcoinUri.value = target.trim().toLowerCase().startsWith('bitcoin:')
      ? parsed.data
      : null
    paymentTarget.value = parsed.data?.address ?? target

    if (parsed.data?.amountSats != null) {
      setValue(parsed.data.amountSats)
      return
    }

    const queryAmount = getQueryNumber(route.query.amount)
    if (queryAmount != null) {
      setValue(queryAmount)
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
    Loading.show({ message: 'Submitting on-chain transfer...' })

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

async function pastePaymentTarget() {
  try {
    paymentTarget.value = await navigator.clipboard.readText()
  } catch (error) {
    notify.error(`Unable to access clipboard ${getErrorMessage(error)}`)
  }
}

async function openScanner() {
  const query: Record<string, string> = {
    returnTo: 'send-onchain',
  }

  const target = paymentTarget.value.trim()
  if (target !== '') {
    query.target = target
  }

  if (amount.value > 0) {
    query.amount = amount.value.toString()
  }

  await router.push({ name: '/scan', query })
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

function getQueryString(value: unknown): string | null {
  const firstValue = Array.isArray(value) ? value[0] : value
  return typeof firstValue === 'string' ? firstValue : null
}

function getQueryNumber(value: unknown): number | null {
  const rawValue = getQueryString(value)
  if (rawValue == null) {
    return null
  }

  const parsed = Number.parseInt(rawValue, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}
</script>

<style scoped>
.send-onchain-federation-selector {
  width: 100%;
  max-width: var(--vipr-width-flow-panel);
  margin-bottom: var(--vipr-space-4);
}

.task-card--secondary {
  border-radius: var(--vipr-radius-button-lg);
}

.send-onchain-uri-details__body {
  padding-top: var(--vipr-space-2);
  padding-bottom: var(--vipr-space-2);
}

.send-onchain-uri-details__item {
  margin-bottom: var(--vipr-space-1);
}

.send-onchain-uri-details__item:last-child {
  margin-bottom: 0;
}
</style>
