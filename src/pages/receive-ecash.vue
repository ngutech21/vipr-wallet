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

      <div class="receive-ecash-content vipr-flow-content">
        <div
          class="receive-ecash-token-preview vipr-flow-panel"
          data-testid="receive-ecash-token-preview"
        >
          <div
            v-if="ecashPreviewState === 'empty'"
            class="receive-ecash-token-preview__card receive-ecash-token-preview__card--placeholder vipr-surface-card vipr-surface-card--strong"
            aria-hidden="true"
          />

          <template v-else-if="previewFederation != null">
            <div
              class="receive-ecash-token-preview__card vipr-surface-card vipr-surface-card--strong"
            >
              <FederationAvatar :federation="previewFederation" />
              <span class="receive-ecash-token-preview__summary">
                <span class="receive-ecash-token-preview__title">
                  {{ previewFederation.title }}
                </span>
                <span class="receive-ecash-token-preview__subtitle">
                  {{ previewRequiresJoin ? 'Join required' : 'Detected federation' }}
                </span>
              </span>
            </div>

            <div
              class="receive-ecash-amount-card vipr-surface-card vipr-surface-card--subtle"
              data-testid="receive-ecash-preview-amount"
            >
              <span class="receive-ecash-amount-card__label">Amount</span>
              <span class="receive-ecash-amount-card__value">
                {{ previewAmountSats.toLocaleString() }} sats
              </span>
            </div>
          </template>

          <div
            v-else
            class="receive-ecash-token-preview__card vipr-surface-card vipr-surface-card--strong"
          >
            <div class="receive-ecash-token-preview__status-icon">
              <q-spinner v-if="isInspectingToken" size="sm" color="primary" />
              <q-icon v-else name="info" />
            </div>
            <span class="receive-ecash-token-preview__summary">
              <span class="receive-ecash-token-preview__title">
                {{ isInspectingToken ? 'Inspecting ecash' : 'Ecash token' }}
              </span>
              <span class="receive-ecash-token-preview__subtitle">
                {{ previewError || 'Paste or scan ecash to detect its federation.' }}
              </span>
            </span>
          </div>
        </div>

        <q-card flat class="task-card vipr-flow-panel vipr-surface-card--strong receive-ecash-card">
          <q-card-section>
            <q-input
              v-model="ecashToken"
              filled
              dense
              dark
              type="textarea"
              rows="3"
              placeholder="Paste ecash token here"
              class="vipr-input receive-ecash-token-input"
              data-testid="receive-ecash-token-input"
            >
              <template #append>
                <div class="vipr-input-actions">
                  <q-btn
                    round
                    dense
                    flat
                    icon="content_paste"
                    aria-label="Paste ecash token"
                    class="vipr-input-action"
                    @click="pasteFromClipboard"
                    data-testid="receive-ecash-paste-btn"
                  />
                  <q-btn
                    round
                    dense
                    flat
                    icon="qr_code_scanner"
                    aria-label="Scan ecash token"
                    class="vipr-input-action"
                    @click="openScanner"
                    data-testid="receive-ecash-open-scanner-btn"
                  />
                </div>
              </template>
            </q-input>
          </q-card-section>
        </q-card>

        <div class="vipr-flow-bottom-action">
          <div class="vipr-flow-bottom-hint">
            {{ receiveEcashHint }}
          </div>
          <q-btn
            :label="paymentFlowCopy.receiveEcash.submitLabel"
            icon="arrow_downward"
            color="primary"
            no-caps
            unelevated
            class="vipr-flow-action vipr-btn vipr-btn--primary vipr-btn--lg"
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
      </div>
    </q-page>
  </transition>
</template>

<script setup lang="ts">
defineOptions({
  name: 'ReceiveEcashPage',
})

import { computed, ref, watch } from 'vue'
import { useWalletStore, type EcashInspection } from 'src/stores/wallet'
import { useFederationStore } from 'src/stores/federation'
import { Loading } from 'quasar'
import { useRoute, useRouter } from 'vue-router'
import { useAppNotify } from 'src/composables/useAppNotify'
import { getErrorMessage } from 'src/utils/error'
import ModalCard from 'src/components/ModalCard.vue'
import JoinFederationPreviewStep from 'src/components/JoinFederationPreviewStep.vue'
import FederationAvatar from 'src/components/FederationAvatar.vue'
import ViprTopbar from 'src/components/ViprTopbar.vue'
import { paymentFlowCopy } from 'src/constants/paymentFlowCopy'
import type { Federation } from 'src/types/federation'
import { getQueryStringOrEmpty } from 'src/utils/routeQuery'

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
const isInspectingToken = ref(false)
const showJoinFederationDialog = ref(false)
const pendingImport = ref<PendingEcashImport | null>(null)
const previewInspection = ref<EcashInspection | null>(null)
const previewFederation = ref<Federation | null>(null)
const previewError = ref('')
const previewToken = ref('')
let previewRequestId = 0
const route = useRoute('/receive-ecash')
const router = useRouter()
const walletStore = useWalletStore()
const federationStore = useFederationStore()
const notify = useAppNotify()

watch(
  () => route.query.token,
  async (token) => {
    const nextToken = getQueryStringOrEmpty(token)
    if (nextToken !== '') {
      ecashToken.value = nextToken
      await inspectEcashPreview(nextToken)
    }
  },
  { immediate: true },
)

const previewAmountSats = computed(() => previewInspection.value?.amountSats ?? 0)
const previewRequiresJoin = computed(() => previewInspection.value?.requiresJoin === true)
const ecashPreviewState = computed(() => {
  if (ecashToken.value.trim() === '' && previewInspection.value == null) {
    return 'empty'
  }

  if (isInspectingToken.value) {
    return 'inspecting'
  }

  if (previewFederation.value != null) {
    return 'ready'
  }

  return 'unknown'
})

const receiveEcashHint = computed(() => {
  if (previewFederation.value != null) {
    return previewRequiresJoin.value
      ? paymentFlowCopy.receiveEcash.joinRequiredHint
      : paymentFlowCopy.receiveEcash.joinedHint
  }

  return paymentFlowCopy.receiveEcash.emptyHint
})

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    ecashToken.value = text
    await inspectEcashPreview(text)
  } catch (error) {
    notify.notify({
      type: 'negative',
      message: `Unable to access clipboard ${getErrorMessage(error)}`,
    })
  }
}

async function openScanner() {
  const query: Record<string, string> = {
    returnTo: 'receive-ecash',
  }

  const token = ecashToken.value.trim()
  if (token !== '') {
    query.token = token
  }

  await router.push({ name: '/scan', query })
}

async function redeemEcash() {
  const token = ecashToken.value.trim()
  if (token === '') return

  try {
    isProcessing.value = true
    Loading.show({ message: 'Inspecting ecash...' })

    const inspection =
      previewToken.value === token && previewInspection.value != null
        ? previewInspection.value
        : await walletStore.inspectEcash(token)
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

async function inspectEcashPreview(rawToken: string) {
  const token = rawToken.trim()
  previewRequestId += 1
  const requestId = previewRequestId
  previewToken.value = token
  previewInspection.value = null
  previewFederation.value = null
  previewError.value = ''

  if (token === '') {
    isInspectingToken.value = false
    return
  }

  try {
    isInspectingToken.value = true
    const inspection = await walletStore.inspectEcash(token)
    if (requestId !== previewRequestId) {
      return
    }

    previewInspection.value = inspection

    if (inspection.matchedFederation != null) {
      previewFederation.value = inspection.matchedFederation
      return
    }

    if (inspection.inviteCode != null) {
      const federation = (await walletStore.previewFederation(inspection.inviteCode)) ?? null
      if (requestId !== previewRequestId) {
        return
      }
      previewFederation.value = federation
      if (federation == null) {
        previewError.value = 'Federation could not be loaded from this token.'
      }
      return
    }

    previewError.value = 'Federation could not be detected from this token.'
  } catch (error) {
    if (requestId !== previewRequestId) {
      return
    }
    previewError.value = `Unable to inspect ecash: ${getErrorMessage(error)}`
  } finally {
    if (requestId === previewRequestId) {
      isInspectingToken.value = false
    }
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
</script>

<style scoped>
.receive-ecash-token-preview {
  min-height: 112px;
  margin-bottom: var(--vipr-space-4);
}

.receive-ecash-token-preview__card {
  display: grid;
  width: 100%;
  grid-template-columns: var(--vipr-control-height-md) minmax(0, 1fr);
  align-items: center;
  gap: var(--vipr-space-3);
  min-height: 74px;
  padding: var(--vipr-space-3) var(--vipr-space-4);
  border-radius: var(--vipr-radius-button-lg);
}

.receive-ecash-token-preview__card--placeholder {
  min-height: 74px;
}

.receive-ecash-token-preview__summary {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--vipr-space-1);
}

.receive-ecash-token-preview__title {
  overflow: hidden;
  color: var(--vipr-text-primary);
  font-size: var(--vipr-font-size-section-title);
  font-weight: 700;
  line-height: var(--vipr-line-height-tight);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.receive-ecash-token-preview__subtitle {
  overflow: hidden;
  color: var(--vipr-text-muted);
  font-size: var(--vipr-font-size-caption);
  line-height: var(--vipr-line-height-body);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.receive-ecash-token-preview__status-icon {
  display: flex;
  width: var(--vipr-control-height-md);
  height: var(--vipr-control-height-md);
  align-items: center;
  justify-content: center;
  border-radius: var(--vipr-radius-button-md);
  background: var(--vipr-color-surface-soft);
  color: var(--vipr-text-secondary);
}

.receive-ecash-amount-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--vipr-space-4);
  margin-top: var(--vipr-space-3);
  padding: var(--vipr-space-3) var(--vipr-space-4);
  border-radius: var(--vipr-radius-button-md);
}

.receive-ecash-amount-card__label {
  color: var(--vipr-text-muted);
  font-size: var(--vipr-font-size-caption);
}

.receive-ecash-amount-card__value {
  color: var(--vipr-text-primary);
  font-size: var(--vipr-font-size-body);
  font-weight: 700;
}

.receive-ecash-card {
  margin-bottom: var(--vipr-space-4);
}

.receive-ecash-token-input :deep(.q-field__control) {
  min-height: calc(var(--vipr-control-height-lg) + var(--vipr-space-10));
  align-items: flex-start;
}

.receive-ecash-token-input :deep(.q-field__native) {
  max-height: calc(var(--vipr-control-height-lg) + var(--vipr-space-5));
  overflow-y: auto;
  resize: none;
  line-height: var(--vipr-line-height-body);
}

.receive-ecash-token-input :deep(.q-field__append) {
  align-self: flex-start;
  padding-top: var(--vipr-space-1);
}

.receive-ecash-title {
  margin-bottom: var(--vipr-space-4);
}

.receive-ecash-dialog-action {
  width: 100%;
}
</style>
