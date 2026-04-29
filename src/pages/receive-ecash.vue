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
    <q-page class="dark-gradient vipr-mobile-page receive-ecash-page">
      <q-dialog v-model="showJoinFederationDialog" position="bottom">
        <ModalCard title="Join Federation" @close="cancelFederationJoin">
          <JoinFederationPreviewStep
            v-if="pendingImport != null"
            :federation="pendingImport.federation"
            :import-amount-sats="pendingImport.amountSats"
          />

          <template #footer>
            <q-btn
              label="Join and receive ecash"
              color="primary"
              no-caps
              unelevated
              class="receive-ecash-dialog-action vipr-btn vipr-btn--primary vipr-btn--lg"
              :loading="isJoiningFederation"
              :disable="isJoiningFederation"
              @click="joinFederationAndRedeem"
              data-testid="receive-ecash-join-submit-btn"
              :data-busy="isJoiningFederation ? 'true' : 'false'"
            >
              <template #loading>
                <q-spinner-dots color="white" />
              </template>
            </q-btn>
          </template>
        </ModalCard>
      </q-dialog>

      <ViprTopbar
        topbar-class="receive-ecash-topbar"
        button-class="receive-ecash-topbar__back"
        button-test-id="receive-ecash-back-btn"
        :back-to="{ name: '/' }"
      />

      <div class="receive-ecash-content">
        <q-card flat class="task-card vipr-flow-panel vipr-surface-card--strong receive-ecash-card">
          <q-card-section>
            <div class="section-title receive-ecash-title">Paste ecash</div>
            <q-input
              v-model="ecashToken"
              filled
              autogrow
              dense
              dark
              type="textarea"
              placeholder="Paste ecash token here"
              class="vipr-input"
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
          class="vipr-flow-panel vipr-btn vipr-btn--primary vipr-btn--lg"
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
import { useWalletStore, type EcashInspection } from 'src/stores/wallet'
import { useFederationStore } from 'src/stores/federation'
import { Loading } from 'quasar'
import { useRoute, useRouter, type LocationQueryValue } from 'vue-router'
import { useAppNotify } from 'src/composables/useAppNotify'
import { getErrorMessage } from 'src/utils/error'
import ModalCard from 'src/components/ModalCard.vue'
import JoinFederationPreviewStep from 'src/components/JoinFederationPreviewStep.vue'
import ViprTopbar from 'src/components/ViprTopbar.vue'
import type { Federation } from 'src/types/federation'

type PendingEcashImport = {
  token: string
  inspection: EcashInspection
  federation: Federation
  amountSats: number
}

const UNKNOWN_FEDERATION_IMPORT_UNAVAILABLE_MESSAGE =
  'Ecash from federations you have not joined yet cannot be imported with the current Fedimint SDK. Join the federation first, then try again.'

const ecashToken = ref('')
const isProcessing = ref(false)
const isJoiningFederation = ref(false)
const showJoinFederationDialog = ref(false)
const pendingImport = ref<PendingEcashImport | null>(null)
const route = useRoute('/receive-ecash')
const router = useRouter()
const walletStore = useWalletStore()
const federationStore = useFederationStore()
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
  const token = ecashToken.value.trim()
  if (token === '') return

  try {
    isProcessing.value = true
    Loading.show({ message: 'Inspecting ecash...' })

    const inspection = await walletStore.inspectEcash(token)
    if (inspection.amountMsats <= 0) {
      return
    }

    const matchedFederation = inspection.matchedFederation
    if (matchedFederation != null) {
      await redeemInspectedEcash(token, matchedFederation)
      return
    }

    await showFederationJoinPrompt(token, inspection)
  } catch (error) {
    if (isEcashInspectionUnavailable(error)) {
      notify.warning(UNKNOWN_FEDERATION_IMPORT_UNAVAILABLE_MESSAGE, { timeout: 6000 })
      return
    }

    notify.notify({
      type: 'negative',
      message: `Failed to redeem ecash: ${getErrorMessage(error)}`,
    })
  } finally {
    isProcessing.value = false
    Loading.hide()
  }
}

async function showFederationJoinPrompt(token: string, inspection: EcashInspection) {
  const inviteCode = inspection.inviteCode
  if (inviteCode == null || inviteCode === '') {
    throw new Error(
      'This ecash belongs to a federation that is not joined, and no invite code was provided.',
    )
  }

  const federation = await walletStore.previewFederation(inviteCode)
  if (federation == null) {
    throw new Error('Unable to load the federation required for this ecash.')
  }

  if (federation.federationId !== inspection.parsed.federation_id) {
    throw new Error('The ecash federation does not match the provided invite code.')
  }

  pendingImport.value = {
    token,
    inspection,
    federation,
    amountSats: inspection.amountSats,
  }
  showJoinFederationDialog.value = true
}

async function joinFederationAndRedeem() {
  const importRequest = pendingImport.value
  if (importRequest == null) {
    return
  }

  showJoinFederationDialog.value = false
  pendingImport.value = null

  try {
    isJoiningFederation.value = true
    Loading.show({ message: 'Joining Federation' })
    federationStore.addFederation(importRequest.federation)

    try {
      await federationStore.selectFederation(importRequest.federation)
    } catch (error) {
      federationStore.deleteFederation(importRequest.federation.federationId)
      throw error
    }

    Loading.show({ message: 'Redeeming ecash...' })
    await redeemInspectedEcash(importRequest.token, importRequest.federation)
  } catch (error) {
    notify.notify({
      type: 'negative',
      message: `Failed to redeem ecash: ${getErrorMessage(error)}`,
    })
  } finally {
    isJoiningFederation.value = false
    Loading.hide()
  }
}

async function redeemInspectedEcash(token: string, federation: Federation) {
  if (federationStore.selectedFederationId !== federation.federationId) {
    await federationStore.selectFederation(federation)
  }

  Loading.show({ message: 'Redeeming ecash...' })
  const amountMsats = (await walletStore.redeemEcash(token)) ?? 0
  if (amountMsats === 0) {
    return
  }

  await router.push({
    name: '/received-lightning',
    query: { amount: Math.floor(amountMsats / 1_000) },
  })
}

function cancelFederationJoin() {
  showJoinFederationDialog.value = false
  pendingImport.value = null
}

function isEcashInspectionUnavailable(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase()
  return (
    message.includes('parseoobnotes') ||
    message.includes('parse oob notes') ||
    message.includes('parse_oob_notes')
  )
}

function getQueryString(value: LocationQueryValue | LocationQueryValue[] | undefined): string {
  const firstValue = Array.isArray(value) ? value[0] : value
  return typeof firstValue === 'string' ? firstValue : ''
}
</script>

<style scoped>
.receive-ecash-content {
  width: 100%;
  padding: var(--vipr-space-0) var(--vipr-space-4) var(--vipr-space-6);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.receive-ecash-card {
  margin-bottom: var(--vipr-space-4);
}

.receive-ecash-title {
  margin-bottom: var(--vipr-space-4);
}

.receive-ecash-dialog-action {
  width: 100%;
}
</style>
