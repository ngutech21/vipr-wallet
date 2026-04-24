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
    <q-page class="column dark-gradient receive-ecash-page">
      <div class="receive-ecash-topbar">
        <q-btn
          flat
          round
          icon="arrow_back"
          :to="{ name: '/' }"
          class="receive-ecash-topbar__back"
          data-testid="receive-ecash-back-btn"
        />
      </div>

      <div class="receive-ecash-content">
        <q-card flat class="task-card receive-ecash-card q-mb-md">
          <q-card-section>
            <div class="section-title q-mb-md">Paste ecash</div>
            <q-input
              v-model="ecashToken"
              filled
              autogrow
              dense
              dark
              type="textarea"
              placeholder="Paste ecash token here"
              class="custom-input"
              data-testid="receive-ecash-token-input"
            >
              <template #after>
                <q-btn
                  round
                  dense
                  flat
                  icon="content_paste"
                  @click="pasteFromClipboard"
                  data-testid="receive-ecash-paste-btn"
                />
              </template>
            </q-input>
          </q-card-section>
        </q-card>

        <q-btn
          label="Receive ecash"
          color="primary"
          no-caps
          unelevated
          class="full-width vipr-btn vipr-btn--primary vipr-btn--lg receive-ecash-action-btn"
          :loading="isProcessing"
          :disable="!ecashToken.trim() || isProcessing"
          @click="redeemEcash"
          data-testid="receive-ecash-submit-btn"
          :data-busy="isProcessing ? 'true' : 'false'"
        >
          <template #loading>
            <q-spinner-dots color="white" />
          </template>
        </q-btn>
      </div>
    </q-page>
  </transition>
</template>

<script setup lang="ts">
defineOptions({
  name: 'ReceiveEcashPage',
})

import { ref, watch } from 'vue'
import { useWalletStore } from 'src/stores/wallet'
import { Loading } from 'quasar'
import { useRoute, useRouter, type LocationQueryValue } from 'vue-router'
import { useAppNotify } from 'src/composables/useAppNotify'
import { getErrorMessage } from 'src/utils/error'

const ecashToken = ref('')
const isProcessing = ref(false)
const route = useRoute('/receive-ecash')
const router = useRouter()
const walletStore = useWalletStore()
const notify = useAppNotify()

watch(
  () => route.query.token,
  (token) => {
    const nextToken = getQueryString(token)
    if (nextToken !== '') {
      ecashToken.value = nextToken
    }
  },
  { immediate: true },
)

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    ecashToken.value = text
  } catch (error) {
    notify.notify({
      type: 'negative',
      message: `Unable to access clipboard ${getErrorMessage(error)}`,
    })
  }
}

async function redeemEcash() {
  if (ecashToken.value.trim() === '') return

  try {
    isProcessing.value = true
    Loading.show({ message: 'Redeeming ecash...' })

    const amountMsats = (await walletStore.redeemEcash(ecashToken.value.trim())) ?? 0
    if (amountMsats === 0) {
      return
    }

    await router.push({
      name: '/received-lightning',
      query: { amount: Math.floor(amountMsats / 1_000) },
    })
  } catch (error) {
    notify.notify({
      type: 'negative',
      message: `Failed to redeem ecash: ${getErrorMessage(error)}`,
    })
  } finally {
    isProcessing.value = false
    Loading.hide()
  }
}

function getQueryString(value: LocationQueryValue | LocationQueryValue[] | undefined): string {
  const firstValue = Array.isArray(value) ? value[0] : value
  return typeof firstValue === 'string' ? firstValue : ''
}
</script>

<style scoped>
.receive-ecash-page {
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
}

.receive-ecash-topbar {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: calc(12px + env(safe-area-inset-top)) 16px 4px;
}

.receive-ecash-topbar__back {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.receive-ecash-content {
  width: 100%;
  padding: 0 16px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.receive-ecash-card {
  width: 100%;
  max-width: 560px;
}

.task-card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.025));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
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

.receive-ecash-action-btn {
  width: 100%;
  max-width: 560px;
}
</style>
