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
    <q-page class="dark-gradient vipr-mobile-page lnurl-page" data-testid="lnurl-page">
      <ViprTopbar topbar-class="lnurl-topbar" button-test-id="lnurl-back-btn" @back="goBack" />

      <div class="lnurl-content">
        <div class="vipr-flow-center">
          <div class="vipr-flow-panel vipr-flow-panel--padded task-card vipr-surface-card--strong">
            <div v-if="isLoading" class="lnurl-loading" data-testid="lnurl-loading-state">
              <q-spinner-dots />
              <div class="vipr-caption">Loading LNURL request</div>
            </div>

            <div
              v-else-if="withdrawParams != null && !isComplete"
              data-testid="lnurl-withdraw-form"
            >
              <div class="lnurl-heading">
                <div class="vipr-eyebrow">LNURL Withdraw</div>
                <h1>Claim Lightning payment</h1>
                <p class="vipr-caption">
                  {{ withdrawDescription }}
                </p>
              </div>

              <div class="lnurl-limits vipr-flow-spacer-md" data-testid="lnurl-withdraw-limits">
                {{ formattedMinAmount }} - {{ formattedMaxAmount }} sats
              </div>

              <AmountDisplay
                :value="formattedAmount"
                class="vipr-flow-spacer-lg"
                data-testid="lnurl-withdraw-amount"
              />

              <NumericKeypad :buttons="keypadButtons" class="vipr-flow-spacer-md" />

              <div
                v-if="amountError != null"
                class="lnurl-error vipr-caption"
                data-testid="lnurl-withdraw-error"
              >
                {{ amountError }}
              </div>

              <q-btn
                label="Claim payment"
                color="primary"
                no-caps
                unelevated
                icon="bolt"
                class="vipr-flow-action vipr-btn vipr-btn--primary vipr-btn--lg"
                :disable="amountError != null || isSubmitting"
                :loading="isSubmitting"
                @click="submitWithdraw"
                data-testid="lnurl-withdraw-submit-btn"
              >
                <template #loading>
                  <q-spinner-dots color="white" />
                </template>
              </q-btn>
            </div>

            <div v-else-if="isComplete" class="lnurl-success" data-testid="lnurl-withdraw-success">
              <q-icon name="check_circle" class="lnurl-success__icon" />
              <h1>Withdrawal requested</h1>
              <p class="vipr-caption">
                The service accepted your invoice. The payment should arrive shortly.
              </p>
              <q-btn
                label="Back to wallet"
                color="primary"
                no-caps
                unelevated
                icon="home"
                class="vipr-flow-action vipr-btn vipr-btn--primary vipr-btn--lg"
                @click="goHome"
                data-testid="lnurl-withdraw-home-btn"
              />
            </div>

            <div v-else class="lnurl-error-state" data-testid="lnurl-error-state">
              <q-icon name="error_outline" class="lnurl-error-state__icon" />
              <h1>Unsupported LNURL</h1>
              <p class="vipr-caption">{{ errorMessage }}</p>
            </div>
          </div>
        </div>
      </div>
    </q-page>
  </transition>
</template>

<script setup lang="ts">
defineOptions({
  name: 'LnurlPage',
})

import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AmountDisplay from 'src/components/AmountDisplay.vue'
import NumericKeypad from 'src/components/NumericKeypad.vue'
import ViprTopbar from 'src/components/ViprTopbar.vue'
import { useAppNotify } from 'src/composables/useAppNotify'
import { useLightningPayment } from 'src/composables/useLightningPayment'
import { useNumericInput } from 'src/composables/useNumericInput'
import { getErrorMessage } from 'src/utils/error'
import { resolveLnurl, submitLnurlWithdrawInvoice, type LnurlWithdrawParams } from 'src/utils/lnurl'

const route = useRoute()
const router = useRouter()
const notify = useAppNotify()
const { createInvoice } = useLightningPayment()
const { value: amount, setValue, keypadButtons } = useNumericInput(0)

const isLoading = ref(true)
const isSubmitting = ref(false)
const isComplete = ref(false)
const errorMessage = ref('This LNURL type is not supported yet.')
const withdrawParams = ref<LnurlWithdrawParams | null>(null)

const lnurlValue = computed(() => {
  const rawValue = Array.isArray(route.query.value) ? route.query.value[0] : route.query.value
  return typeof rawValue === 'string' ? stripLightningUriPrefix(rawValue.trim().toLowerCase()) : ''
})

const minWithdrawSats = computed(() =>
  withdrawParams.value == null ? 0 : Math.ceil(withdrawParams.value.minWithdrawable / 1_000),
)
const maxWithdrawSats = computed(() =>
  withdrawParams.value == null ? 0 : Math.floor(withdrawParams.value.maxWithdrawable / 1_000),
)
const formattedAmount = computed(() => amount.value.toLocaleString())
const formattedMinAmount = computed(() => minWithdrawSats.value.toLocaleString())
const formattedMaxAmount = computed(() => maxWithdrawSats.value.toLocaleString())
const withdrawDescription = computed(() => {
  const description = withdrawParams.value?.defaultDescription
  return description != null && description !== ''
    ? description
    : 'Choose how much you want to claim.'
})
const amountError = computed(() => {
  if (withdrawParams.value == null) {
    return null
  }

  if (maxWithdrawSats.value < minWithdrawSats.value || maxWithdrawSats.value <= 0) {
    return 'This withdraw request has invalid amount limits.'
  }

  if (amount.value < minWithdrawSats.value) {
    return `Amount must be at least ${formattedMinAmount.value} sats`
  }

  if (amount.value > maxWithdrawSats.value) {
    return `Amount must be at most ${formattedMaxAmount.value} sats`
  }

  return null
})

watch(
  lnurlValue,
  async (nextLnurl) => {
    if (nextLnurl === '') {
      isLoading.value = false
      errorMessage.value = 'No LNURL request was provided.'
      return
    }

    isLoading.value = true
    isComplete.value = false
    withdrawParams.value = null
    errorMessage.value = 'This LNURL type is not supported yet.'

    try {
      const params = await resolveLnurl(nextLnurl)

      if (params.tag === 'payRequest') {
        await router.push({
          name: '/send',
          query: { invoice: nextLnurl },
        })
        return
      }

      withdrawParams.value = params
      setValue(Math.floor(params.maxWithdrawable / 1_000))
    } catch (error) {
      errorMessage.value = getErrorMessage(error)
      notify.error(`Failed to load LNURL request: ${errorMessage.value}`)
    } finally {
      isLoading.value = false
    }
  },
  { immediate: true },
)

async function submitWithdraw() {
  const params = withdrawParams.value
  if (params == null || amountError.value != null) {
    return
  }

  isSubmitting.value = true

  try {
    const invoiceResult = await createInvoice(amount.value, withdrawDescription.value)

    if (!invoiceResult.success || invoiceResult.invoice == null || invoiceResult.invoice === '') {
      throw invoiceResult.error ?? new Error('Failed to create invoice')
    }

    await submitLnurlWithdrawInvoice(params, invoiceResult.invoice)
    isComplete.value = true
  } catch (error) {
    const message = getErrorMessage(error)
    errorMessage.value = message
    notify.error(`Failed to claim LNURL withdraw: ${message}`)
  } finally {
    isSubmitting.value = false
  }
}

async function goBack() {
  await router.push({ name: '/scan' })
}

async function goHome() {
  await router.push({ name: '/' })
}

function stripLightningUriPrefix(value: string): string {
  if (value.startsWith('web+lightning:')) {
    return value.substring('web+lightning:'.length)
  }

  if (value.startsWith('lightning:')) {
    return value.substring('lightning:'.length)
  }

  return value
}
</script>

<style scoped>
.lnurl-content {
  box-sizing: border-box;
  width: 100%;
  padding: var(--vipr-space-0) var(--vipr-space-4) var(--vipr-space-6);
}

.lnurl-heading,
.lnurl-loading,
.lnurl-success,
.lnurl-error-state {
  text-align: center;
}

.lnurl-heading h1,
.lnurl-success h1,
.lnurl-error-state h1 {
  margin: var(--vipr-space-2) 0 var(--vipr-space-2);
  color: var(--vipr-text-primary);
  font-size: 1.35rem;
  line-height: 1.2;
  font-weight: 700;
}

.lnurl-limits {
  color: var(--vipr-text-secondary);
  text-align: center;
}

.lnurl-error {
  min-height: 1.25rem;
  color: var(--vipr-warning-text);
  text-align: center;
}

.lnurl-loading,
.lnurl-success,
.lnurl-error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--vipr-space-3);
}

.lnurl-success__icon,
.lnurl-error-state__icon {
  color: var(--vipr-brand-primary);
  font-size: 3rem;
}
</style>
