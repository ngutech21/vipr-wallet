<template>
  <transition
    appear
    enter-active-class="animated slideInLeft"
    leave-active-class="animated slideOutLeft"
  >
    <q-page class="column dark-gradient vipr-mobile-page send-page">
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
      <div class="send-content q-px-md">
        <!-- Payment input section -->
        <template v-if="!decodedInvoice">
          <q-card flat class="task-card q-mb-md">
            <q-card-section>
              <div class="section-title q-mb-sm">Send payment</div>
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

          <div class="q-mb-md">
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
                  <q-icon v-else name="account_circle" size="md" color="grey-5" />
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
              <q-card-section class="row items-center q-col-gutter-sm">
                <div class="col-auto">
                  <q-icon name="search" size="md" color="grey-5" />
                </div>
                <div class="col">
                  <div class="text-subtitle1 text-grey-4">Contacts appear as you type</div>
                  <div class="text-caption text-grey-6">
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
              <q-card-section class="row items-center q-col-gutter-sm">
                <div class="col-auto">
                  <q-icon name="search_off" size="md" color="grey-5" />
                </div>
                <div class="col">
                  <div class="text-subtitle1 text-grey-4">No matching contacts</div>
                  <div class="text-caption text-grey-6">
                    Try a different name or Lightning address.
                  </div>
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
              <q-card-section class="row items-center q-col-gutter-sm">
                <div class="col-auto">
                  <q-icon name="account_circle" size="md" color="grey-5" />
                </div>
                <div class="col text-subtitle1 text-grey-5">No Contacts</div>
              </q-card-section>
            </q-card>
          </div>

          <!-- Amount input section (for lightning address) -->
          <q-slide-transition>
            <q-card v-if="amountRequired" flat class="task-card q-mb-md">
              <q-card-section>
                <div class="section-title q-mb-sm">Payment details</div>

                <div class="row q-col-gutter-md">
                  <div class="col-12">
                    <AmountDisplay
                      :value="formattedInvoiceAmount"
                      label="Amount in sats"
                      class="q-mb-md"
                      data-testid="send-amount-input"
                    />
                  </div>
                </div>

                <NumericKeypad :buttons="keypadButtons" class="q-mb-md" />

                <div class="row q-col-gutter-md q-mt-md" v-if="lnAddress">
                  <div class="col-12">
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
          <div class="q-mt-lg">
            <q-btn
              :label="amountRequired ? 'Create Invoice' : 'Continue'"
              color="primary"
              no-caps
              unelevated
              class="full-width q-py-sm vipr-btn vipr-btn--primary vipr-btn--lg"
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
}

.text-grey {
  color: var(--vipr-text-grey);
}

.bg-dark {
  background-color: rgba(255, 255, 255, 0.03);
}

.rounded-contact-list {
  border-radius: var(--vipr-radius-card);
  overflow: hidden;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.025));
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.rounded-contact-list :deep(.q-item__label--caption) {
  color: var(--vipr-text-muted);
}

.empty-contacts-card {
  border-radius: var(--vipr-radius-card);
}

.contacts-hint-card {
  opacity: 0.92;
}
</style>
