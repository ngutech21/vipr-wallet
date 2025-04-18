<template>
  <transition
    appear
    enter-active-class="animated slideInRight"
    leave-active-class="animated slideOutRight"
  >
    <q-layout view="lHh Lpr lFf">
      <q-page-container>
        <q-page class="column dark-gradient">
          <q-toolbar class="header-section">
            <q-btn flat round icon="arrow_back" :to="'/'" />
            <q-toolbar-title class="text-center no-wrap">Receive Offline</q-toolbar-title>
            <div class="q-ml-md" style="width: 40px"></div>
          </q-toolbar>

          <div class="q-px-md q-pt-md">
            <q-card flat class="glass-effect q-mb-md">
              <q-card-section>
                <q-input
                  v-model="ecashToken"
                  filled
                  autogrow
                  dense
                  dark
                  type="textarea"
                  placeholder="Paste eCash token here"
                  class="custom-input"
                >
                  <template v-slot:after>
                    <q-btn round dense flat icon="content_paste" @click="pasteFromClipboard" />
                  </template>
                </q-input>
              </q-card-section>
            </q-card>

            <div class="q-mt-lg">
              <q-btn
                label="Receive eCash"
                color="primary"
                class="full-width q-py-sm"
                size="lg"
                :loading="isProcessing"
                :disable="!ecashToken.trim()"
                @click="redeemEcash"
              >
                <template v-slot:loading>
                  <q-spinner-dots color="white" />
                </template>
              </q-btn>
            </div>
          </div>
        </q-page>
      </q-page-container>
    </q-layout>
  </transition>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useWalletStore } from 'src/stores/wallet'
import { useQuasar, Loading } from 'quasar'
import { useRouter } from 'vue-router'
import { useTransactionsStore } from 'src/stores/transactions'
import { useFederationStore } from 'src/stores/federation'
import { getErrorMessage } from 'src/utils/error'
import { useLightningStore } from 'src/stores/lightning'

const ecashToken = ref('')
const isProcessing = ref(false)
const $q = useQuasar()
const router = useRouter()
const walletStore = useWalletStore()
const transactionsStore = useTransactionsStore()
const federationsStore = useFederationStore()
const lightningStore = useLightningStore()

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    ecashToken.value = text
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: `Unable to access clipboard ${getErrorMessage(error)}`,
      position: 'top',
    })
  }
}

async function redeemEcash() {
  if (!ecashToken.value.trim()) return

  try {
    isProcessing.value = true
    Loading.show({ message: 'Redeeming eCash...' })

    const amountMSats = (await walletStore.redeemEcash(ecashToken.value.trim())) ?? 0
    if (amountMSats === 0) {
      return
    }

    const amountInSats = amountMSats / 1_000

    const selectedFederationId = federationsStore.selectedFederation?.federationId ?? ''

    // FIXME use different type for ecash transactions
    await transactionsStore.addReceiveTransaction({
      amountInSats,
      createdAt: new Date(),
      invoice: 'received ecash offline',
      status: 'completed',
      amountInFiat: await lightningStore.satsToFiat(amountInSats),
      fiatCurrency: 'usd',
      federationId: selectedFederationId,
    })

    // Navigate back to home
    await router.push({
      name: 'received-lightning',
      query: { amount: amountMSats / 1_000 },
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: `Failed to redeem eCash: ${getErrorMessage(error)}`,
      position: 'top',
    })
  } finally {
    isProcessing.value = false
    Loading.hide()
  }
}
</script>

<style scoped>
.custom-input :deep(.q-field__control) {
  background-color: rgba(255, 255, 255, 0.05);
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

.glass-effect {
  background-color: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  border-radius: 16px;
}
</style>
