<template>
  <transition
    appear
    enter-active-class="animated slideInLeft"
    leave-active-class="animated slideOutLeft"
  >
    <q-page class="dark-gradient vipr-mobile-page send-page">
      <div class="vipr-topbar send-topbar">
        <q-btn
          flat
          round
          icon="arrow_back"
          :to="{ name: '/' }"
          class="vipr-topbar__back send-topbar__back"
          data-testid="send-back-btn"
        />
      </div>
      <div class="send-content">
        <!-- Payment input section -->
        <template v-if="!decodedInvoice">
          <q-card flat class="task-card send-section-card">
            <q-card-section>
              <div class="section-title send-section-title">Send payment</div>
              <q-input
                v-model="lightningInvoice"
                filled
                dense
                dark
                type="text"
                placeholder="Enter Lightning invoice, address or contact"
                class="vipr-input vipr-input--single-line"
                data-testid="send-invoice-input"
              >
                <template #after>
                  <q-btn
                    round
                    dense
                    flat
                    icon="qr_code_scanner"
                    @click="openScanner"
                    data-testid="send-open-scanner-btn"
                  />
                </template>
              </q-input>
            </q-card-section>
          </q-card>

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
              v-else-if="hasSyncedContacts && !hasContactQuery"
              flat
              class="task-card empty-contacts-card contacts-hint-card"
              data-testid="send-contacts-hint"
            >
              <q-card-section class="send-contact-hint">
                <div class="send-contact-hint__icon">
                  <q-icon name="search" size="md" class="send-contact-icon" />
                </div>
                <div class="send-contact-hint__body">
                  <div class="vipr-section-title">Contacts appear as you type</div>
                  <div class="vipr-caption">
                    Use the field above to search by name or Lightning address.
                  </div>
                </div>
              </q-card-section>
            </q-card>

            <q-card
              v-else-if="hasSyncedContacts"
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

            <q-card
              v-else
              flat
              bordered
              class="task-card empty-contacts-card"
              data-testid="send-no-contacts"
            >
              <q-card-section class="send-contact-hint">
                <div class="send-contact-hint__icon">
                  <q-icon name="account_circle" size="md" class="send-contact-icon" />
                </div>
                <div class="send-contact-hint__body vipr-section-title">No Contacts</div>
              </q-card-section>
            </q-card>
          </div>

          <!-- Amount input section (for lightning address) -->
          <q-slide-transition>
            <q-card v-if="amountRequired" flat class="task-card send-section-card">
              <q-card-section>
                <div class="section-title send-section-title">Payment details</div>

                <div class="send-payment-details">
                  <div class="send-payment-details__field">
                    <AmountDisplay
                      :value="formattedInvoiceAmount"
                      label="Amount in sats"
                      class="vipr-flow-spacer-md"
                      data-testid="send-amount-input"
                    />
                  </div>
                </div>

                <NumericKeypad :buttons="keypadButtons" class="vipr-flow-spacer-md" />

                <div class="send-payment-details send-payment-details--spaced" v-if="lnAddress">
                  <div class="send-payment-details__field">
                    <q-input
                      filled
                      dense
                      dark
                      v-model="invoiceMemo"
                      label="Memo (optional)"
                      class="vipr-input"
                      data-testid="send-memo-input"
                    />
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </q-slide-transition>

          <!-- Action button -->
          <div class="send-action">
            <q-btn
              :label="amountRequired ? 'Create Invoice' : 'Continue'"
              color="primary"
              no-caps
              unelevated
              class="send-action__button vipr-btn vipr-btn--primary vipr-btn--lg"
              size="lg"
              :loading="isProcessing"
              :disable="isProcessing"
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
import AmountDisplay from 'src/components/AmountDisplay.vue'
import NumericKeypad from 'src/components/NumericKeypad.vue'
import { useRoute, useRouter } from 'vue-router'
import { useInvoiceDecoding } from 'src/composables/useInvoiceDecoding'
import { useLightningPayment } from 'src/composables/useLightningPayment'
import { useNumericInput } from 'src/composables/useNumericInput'
import { useNostrStore } from 'src/stores/nostr'
import type { SyncedNostrContact } from 'src/types/nostr'
import { getNostrContactDisplayName, getNostrContactSubtitle } from 'src/utils/nostrContacts'

const lightningInvoice = ref('')

const route = useRoute('/send')
const router = useRouter()
const nostrStore = useNostrStore()
const invoiceMemo = ref('')
const { value: invoiceAmount, keypadButtons } = useNumericInput(0)
const formattedInvoiceAmount = computed(() => invoiceAmount.value.toLocaleString())

// Use the invoice decoding composable
const {
  isProcessing,
  amountRequired,
  lnAddress,
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

// FIXME
// Validate input before allowing to continue
// const isValidInput = computed(() => {
//   if (amountRequired.value) {
//     return invoiceAmount.value > 0 && lightningInvoice.value.includes('@')
//   }
//   return lightningInvoice.value.trim().startsWith('lnbc')
// })

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
      await decodeInvoice()
    }
  },
  { immediate: true },
)

async function decodeInvoice() {
  await decodeInvoiceFromComposable(lightningInvoice.value)
}

async function openScanner() {
  await router.push({ name: '/scan' })
}

async function createInvoice() {
  await createInvoiceFromInput(lightningInvoice.value, invoiceAmount.value, invoiceMemo.value)
}

async function selectContact(paymentTarget: string) {
  lightningInvoice.value = paymentTarget
  await decodeInvoice()
}

async function payInvoice() {
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

function getContactDisplayName(contact: SyncedNostrContact): string {
  return getNostrContactDisplayName(contact)
}

function getContactSubtitle(contact: SyncedNostrContact): string {
  return getNostrContactSubtitle(contact)
}
</script>

<style scoped>
.entry-container {
  width: 100%;
  max-width: 500px;
  border-radius: var(--vipr-radius-md);
}

.send-content {
  width: 100%;
  padding-right: var(--vipr-space-4);
  padding-left: var(--vipr-space-4);
}

.send-section-card,
.send-contacts-block {
  margin-bottom: var(--vipr-space-4);
}

.send-section-title {
  margin-bottom: var(--vipr-space-2);
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

.send-payment-details {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--vipr-space-4);
}

.send-payment-details--spaced {
  margin-top: var(--vipr-space-4);
}

.send-action {
  margin-top: var(--vipr-space-6);
}

.send-action__button {
  width: 100%;
  padding-top: var(--vipr-space-2);
  padding-bottom: var(--vipr-space-2);
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
