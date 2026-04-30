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
    <q-page class="dark-gradient vipr-mobile-page send-page">
      <ViprTopbar
        topbar-class="send-topbar"
        button-class="send-topbar__back"
        button-test-id="send-back-btn"
        @back="goBack"
      />
      <div
        class="send-content vipr-flow-content"
        :class="{ 'vipr-flow-content--keypad': amountRequired }"
      >
        <FederationSelector class="send-federation-control" :selectable="!decodedInvoice" />

        <!-- Payment input section -->
        <template v-if="!decodedInvoice">
          <q-input
            v-model="lightningInvoice"
            filled
            dense
            dark
            type="text"
            placeholder="Enter Lightning invoice, address or contact"
            class="vipr-input vipr-input--single-line send-invoice-input"
            data-testid="send-invoice-input"
          >
            <template #append>
              <div class="vipr-input-actions">
                <q-btn
                  round
                  dense
                  flat
                  icon="content_paste"
                  aria-label="Paste payment request"
                  class="vipr-input-action"
                  @click="pastePaymentRequest"
                  data-testid="send-paste-input-btn"
                />
                <q-btn
                  round
                  dense
                  flat
                  icon="qr_code_scanner"
                  aria-label="Scan payment request"
                  class="vipr-input-action"
                  @click="openScanner"
                  data-testid="send-open-scanner-btn"
                />
              </div>
            </template>
          </q-input>

          <div class="send-contacts-block">
            <q-list
              v-if="showFilteredContacts"
              bordered
              separator
              class="rounded-contact-list"
              data-testid="send-contacts-results"
            >
              <q-item
                v-for="contact in suggestedContacts"
                :key="contact.pubkey"
                clickable
                @click="selectContact(contact.paymentTarget)"
                :data-testid="`send-contact-item-${contact.pubkey}`"
              >
                <q-item-section avatar>
                  <q-avatar v-if="contact.picture">
                    <img :src="contact.picture" :alt="getContactDisplayName(contact)" />
                  </q-avatar>
                  <q-icon v-else name="account_circle" size="md" class="send-contact-icon" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ getContactDisplayName(contact) }}</q-item-label>
                  <q-item-label caption>{{ getContactSubtitle(contact) }}</q-item-label>
                </q-item-section>
              </q-item>
            </q-list>

            <q-card
              v-else-if="hasSyncedContacts && hasContactQuery"
              flat
              class="task-card empty-contacts-card contacts-hint-card"
              data-testid="send-no-contact-matches"
            >
              <q-card-section class="send-contact-hint">
                <div class="send-contact-hint__icon">
                  <q-icon name="search_off" size="md" class="send-contact-icon" />
                </div>
                <div class="send-contact-hint__body">
                  <div class="vipr-section-title">No matching contacts</div>
                  <div class="vipr-caption">Try a different name or Lightning address.</div>
                </div>
              </q-card-section>
            </q-card>

            <template v-else></template>
          </div>

          <!-- Amount input section (for lightning address) -->
          <q-slide-transition>
            <AmountEntryGroup
              v-if="amountRequired"
              :value="formattedInvoiceAmount"
              :buttons="keypadButtons"
              label="Amount in sats"
              :error-message="amountError"
              :meta-text="lnurlAmountHint"
              amount-test-id="send-amount-input"
              meta-test-id="send-lnurl-limit-hint"
              amount-class="send-amount-display"
              class="send-amount-entry"
            >
              <q-input
                v-if="lnAddress"
                v-model="invoiceMemo"
                filled
                dense
                dark
                label="Memo (optional)"
                class="vipr-input"
                data-testid="send-memo-input"
              />
            </AmountEntryGroup>
          </q-slide-transition>

          <!-- Action button -->
          <div class="vipr-flow-bottom-action">
            <div class="vipr-flow-bottom-hint">
              {{ sendBottomHint }}
            </div>
            <q-btn
              :label="sendActionLabel"
              :icon="sendActionIcon"
              color="primary"
              no-caps
              unelevated
              class="vipr-flow-action vipr-btn vipr-btn--primary vipr-btn--lg"
              size="lg"
              :loading="isProcessing"
              :disable="isContinueDisabled"
              @click="amountRequired ? createInvoice() : decodeInvoice()"
              data-testid="send-continue-btn"
              :data-busy="isProcessing ? 'true' : 'false'"
            >
              <!-- :disable="!isValidInput" -->
              <template #loading>
                <q-spinner-dots color="white" />
              </template>
            </q-btn>
          </div>
        </template>

        <!-- Show payment verification component if invoice is decoded -->
        <VerifyPayment
          v-else
          :decoded-invoice="decodedInvoice"
          :balance-error-message="paymentBalanceError"
          @cancel="decodedInvoice = null"
          @pay="payInvoice"
        />
      </div>
    </q-page>
  </transition>
</template>

<script setup lang="ts">
defineOptions({
  name: 'SendPage',
})

import { computed, ref, watch } from 'vue'
import VerifyPayment from 'components/VerifyPayment.vue'
import AmountEntryGroup from 'src/components/AmountEntryGroup.vue'
import FederationSelector from 'src/components/FederationSelector.vue'
import ViprTopbar from 'src/components/ViprTopbar.vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppNotify } from 'src/composables/useAppNotify'
import { useInvoiceDecoding } from 'src/composables/useInvoiceDecoding'
import { useLightningPayment } from 'src/composables/useLightningPayment'
import { useNumericInput } from 'src/composables/useNumericInput'
import { paymentFlowCopy } from 'src/constants/paymentFlowCopy'
import { useFederationStore } from 'src/stores/federation'
import { useWalletStore } from 'src/stores/wallet'
import { useNostrStore } from 'src/stores/nostr'
import type { SyncedNostrContact } from 'src/types/nostr'
import { getErrorMessage } from 'src/utils/error'
import { getNostrContactDisplayName, getNostrContactSubtitle } from 'src/utils/nostrContacts'
import { getPositiveQueryInteger, getQueryString } from 'src/utils/routeQuery'

const lightningInvoice = ref('')

const route = useRoute('/send')
const router = useRouter()
const nostrStore = useNostrStore()
const federationStore = useFederationStore()
const walletStore = useWalletStore()
const notify = useAppNotify()
const invoiceMemo = ref('')
const { value: invoiceAmount, keypadButtons } = useNumericInput(0)
const formattedInvoiceAmount = computed(() => invoiceAmount.value.toLocaleString())
const activeBalanceSats = computed(() => Math.floor(walletStore.balance))
const hasSelectedFederation = computed(() => federationStore.selectedFederation != null)

// Use the invoice decoding composable
const {
  isProcessing,
  amountRequired,
  lnAddress,
  lnurlPayLimits,
  decodedInvoice,
  decodeInvoice: decodeInvoiceFromComposable,
  createInvoiceFromInput,
} = useInvoiceDecoding()

// Use the lightning payment composable
const { payInvoice: payInvoiceFromComposable } = useLightningPayment()
const hasSyncedContacts = computed(() => nostrStore.contacts.length > 0)
const hasContactQuery = computed(() => lightningInvoice.value.trim().length >= 2)
const suggestedContacts = computed(() => {
  if (!hasContactQuery.value) {
    return []
  }

  return nostrStore.getSuggestedContacts(lightningInvoice.value.trim())
})
const showFilteredContacts = computed(
  () => hasContactQuery.value && suggestedContacts.value.length > 0,
)

const amountError = computed(() => {
  if (!amountRequired.value) {
    return null
  }

  if (!hasSelectedFederation.value) {
    return 'Select a federation before sending'
  }

  if (invoiceAmount.value <= 0) {
    return null
  }

  const lnurlError = getLnurlAmountError(invoiceAmount.value)
  if (lnurlError != null) {
    return lnurlError
  }

  if (invoiceAmount.value > activeBalanceSats.value) {
    return `Amount must be ${activeBalanceSats.value.toLocaleString()} sats or less`
  }

  return null
})

const paymentBalanceError = computed(() => {
  if (decodedInvoice.value == null) {
    return null
  }

  if (!hasSelectedFederation.value) {
    return 'Select a federation before paying'
  }

  const invoiceAmountSats = decodedInvoice.value.amount ?? 0
  if (invoiceAmountSats > activeBalanceSats.value) {
    return `Insufficient balance. Available: ${activeBalanceSats.value.toLocaleString()} sats`
  }

  return null
})

const isContinueDisabled = computed(() => isProcessing.value || amountError.value != null)
const sendActionLabel = computed(() =>
  amountRequired.value
    ? paymentFlowCopy.sendLightning.reviewLabel
    : paymentFlowCopy.sendLightning.continueLabel,
)
const sendActionIcon = computed(() => (amountRequired.value ? 'bolt' : 'arrow_forward'))
const sendBottomHint = computed(() =>
  amountRequired.value
    ? paymentFlowCopy.sendLightning.reviewHint
    : paymentFlowCopy.sendLightning.inputHint,
)
const lnurlAmountHint = computed(() => {
  const limits = getLnurlLimitSats()
  if (limits == null) {
    return ''
  }

  if (limits.minSats === limits.maxSats) {
    return `Limit: ${limits.minSats.toLocaleString()} sats`
  }

  return `Limit: ${limits.minSats.toLocaleString()} - ${limits.maxSats.toLocaleString()} sats`
})

// Watch for query params
watch(
  () => route.query.invoice,
  async (newInvoice) => {
    const invoiceValue = Array.isArray(newInvoice) ? newInvoice[0] : newInvoice
    if (typeof invoiceValue === 'string') {
      if (invoiceValue.startsWith('web+lightning:') || invoiceValue.startsWith('lightning:')) {
        lightningInvoice.value = invoiceValue
          .replace('web+lightning:', '')
          .replace('lightning:', '')
      } else {
        lightningInvoice.value = invoiceValue
      }
      restoreSendDraftFromQuery()
      if (getQueryString(route.query.restoreDraft) !== '1') {
        await decodeInvoice()
      }
    }
  },
  { immediate: true },
)

async function decodeInvoice() {
  await decodeInvoiceFromComposable(lightningInvoice.value)
}

async function pastePaymentRequest() {
  try {
    const text = await navigator.clipboard.readText()
    lightningInvoice.value = text

    if (text.trim() !== '') {
      await decodeInvoice()
    }
  } catch (error) {
    notify.error(`Unable to access clipboard ${getErrorMessage(error)}`)
  }
}

async function openScanner() {
  await router.push({
    name: '/scan',
    query: buildScanReturnQuery(),
  })
}

async function createInvoice() {
  if (amountError.value != null) {
    notify.error(amountError.value)
    return
  }

  await createInvoiceFromInput(lightningInvoice.value, invoiceAmount.value, invoiceMemo.value)
}

async function selectContact(paymentTarget: string) {
  lightningInvoice.value = paymentTarget
  await decodeInvoice()
}

async function payInvoice() {
  if (paymentBalanceError.value != null) {
    notify.error(paymentBalanceError.value)
    return
  }

  const amountInSats = decodedInvoice.value?.amount ?? 0
  const invoiceToPay = decodedInvoice.value?.invoice ?? lightningInvoice.value

  const result = await payInvoiceFromComposable(invoiceToPay, amountInSats)

  if (result.success) {
    await router.push({
      path: '/sent-lightning',
      query: { amount: result.amountSats, fee: result.fee },
    })
  }
}

async function goBack() {
  if (decodedInvoice.value != null) {
    decodedInvoice.value = null
    return
  }

  await router.push({ name: '/' })
}

function buildScanReturnQuery() {
  const query: Record<string, string> = {
    returnTo: 'send',
  }

  const invoice = lightningInvoice.value.trim()
  if (invoice !== '') {
    query.invoice = invoice
  }

  if (invoiceAmount.value > 0) {
    query.amount = invoiceAmount.value.toString()
  }

  const memo = invoiceMemo.value.trim()
  if (memo !== '') {
    query.memo = memo
  }

  return query
}

function restoreSendDraftFromQuery() {
  const amount = getPositiveQueryInteger(route.query.amount)
  if (amount != null) {
    invoiceAmount.value = amount
  }

  const memo = getQueryString(route.query.memo)
  if (memo != null) {
    invoiceMemo.value = memo
  }
}

function getContactDisplayName(contact: SyncedNostrContact): string {
  return getNostrContactDisplayName(contact)
}

function getContactSubtitle(contact: SyncedNostrContact): string {
  return getNostrContactSubtitle(contact)
}

function getLnurlAmountError(amountSats: number): string | null {
  const limits = getLnurlLimitSats()
  if (limits == null) {
    return null
  }

  if (amountSats < limits.minSats) {
    return `Amount must be at least ${limits.minSats.toLocaleString()} sats`
  }

  if (amountSats > limits.maxSats) {
    return `Amount must be ${limits.maxSats.toLocaleString()} sats or less`
  }

  return null
}

function getLnurlLimitSats(): { minSats: number; maxSats: number } | null {
  const limits = lnurlPayLimits.value
  if (limits == null) {
    return null
  }

  const minSats = Math.ceil(limits.minSendableMsats / 1_000)
  const maxSats = Math.floor(limits.maxSendableMsats / 1_000)

  if (!Number.isFinite(minSats) || !Number.isFinite(maxSats) || minSats > maxSats) {
    return null
  }

  return {
    minSats,
    maxSats,
  }
}
</script>

<style scoped>
.entry-container {
  width: 100%;
  max-width: 500px;
  border-radius: var(--vipr-radius-md);
}

.send-invoice-input,
.send-amount-entry,
.send-contacts-block,
.send-federation-control {
  width: 100%;
  max-width: var(--vipr-width-flow-panel);
}

.send-invoice-input,
.send-amount-entry,
.send-contacts-block,
.send-federation-control {
  margin-bottom: var(--vipr-space-3);
}

.send-amount-display :deep(.amount-display) {
  min-height: 68px;
  padding: var(--vipr-space-3) var(--vipr-space-4);
  gap: var(--vipr-space-1);
}

.send-amount-display :deep(.amount-display__label) {
  font-size: var(--vipr-font-size-label);
}

.send-amount-display :deep(.amount-display__value) {
  font-size: 2rem;
}

.send-contact-hint {
  display: flex;
  align-items: center;
  gap: var(--vipr-space-2);
}

.send-contact-hint__icon {
  flex: 0 0 auto;
}

.send-contact-hint__body {
  min-width: 0;
  flex: 1 1 auto;
}

.rounded-contact-list {
  border-radius: var(--vipr-radius-card);
  overflow: hidden;
  background: var(--vipr-send-contact-list-bg);
  border: 1px solid var(--vipr-send-contact-list-border);
}

.rounded-contact-list :deep(.q-item__label--caption) {
  color: var(--vipr-text-muted);
}

.send-contact-icon {
  color: var(--vipr-send-contact-icon-color);
}

.empty-contacts-card {
  border-radius: var(--vipr-radius-card);
}

.contacts-hint-card {
  opacity: var(--vipr-send-contacts-hint-opacity);
}
</style>
