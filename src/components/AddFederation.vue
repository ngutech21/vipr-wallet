<template>
  <ModalCard
    :title="dialogTitle"
    :show-back="step === 'preview'"
    data-testid="add-federation-form"
    @back="goBackToInviteStep"
    @close="onClose"
  >
    <JoinFederationInviteStep
      v-if="step === 'invite'"
      :invite-code="inviteCode"
      @update:invite-code="updateInviteCode"
      @paste="pasteFromClipboard"
    />

    <JoinFederationPreviewStep
      v-else-if="previewFederation != null"
      :federation="previewFederation"
      :import-amount-sats="importAmountSats ?? null"
    />

    <template #footer>
      <q-btn
        v-if="step === 'invite'"
        label="Preview Federation"
        color="primary"
        no-caps
        unelevated
        class="add-federation-submit vipr-btn vipr-btn--primary vipr-btn--lg"
        data-testid="add-federation-preview-btn"
        :disable="isSubmitting || inviteCode.trim() === ''"
        :loading="isSubmitting"
        :data-busy="isSubmitting ? 'true' : 'false'"
        @click="loadPreview"
      />

      <q-btn
        v-else-if="previewFederation != null"
        label="Join Federation"
        color="primary"
        no-caps
        unelevated
        class="add-federation-submit vipr-btn vipr-btn--primary vipr-btn--lg"
        data-testid="add-federation-submit-btn"
        :disable="isSubmitting"
        :loading="isSubmitting"
        :data-busy="isSubmitting ? 'true' : 'false'"
        @click="addFederation"
      />
    </template>
  </ModalCard>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useWalletStore } from 'src/stores/wallet'
import { useFederationStore } from 'src/stores/federation'
import type { Federation } from 'src/types/federation'
import ModalCard from 'src/components/ModalCard.vue'
import JoinFederationInviteStep from 'src/components/JoinFederationInviteStep.vue'
import JoinFederationPreviewStep from 'src/components/JoinFederationPreviewStep.vue'
import { Loading } from 'quasar'
import { useAppNotify } from 'src/composables/useAppNotify'
import { getErrorMessage } from 'src/utils/error'
import { logger } from 'src/services/logger'
import {
  getAddFederationPreview,
  getAddFederationStep,
  isAddFederationSubmitting,
  resolveInitialAddFederationState,
  resolveJoinFailure,
  resolvePreviewFailure,
  resolvePreviewSuccess,
  returnToInviteStep,
  startJoin,
  startPreview,
  updateInviteCode as resolveInviteCodeUpdate,
} from 'src/utils/addFederationState'

const walletStore = useWalletStore()
const federationStore = useFederationStore()
const notify = useAppNotify()

const emit = defineEmits<{
  close: []
  back: []
}>()

const props = defineProps<{
  initialInviteCode?: string | null
  initialPreviewFederation?: Federation | null
  autoPreview?: boolean
  importAmountSats?: number | null
  backTarget?: 'invite' | 'discover'
}>()

const state = ref(
  resolveInitialAddFederationState({
    initialInviteCode: props.initialInviteCode,
    initialPreviewFederation: props.initialPreviewFederation,
  }),
)
let previewRequestId = 0
let activeLoadingRequestId: number | null = null

const inviteCode = computed(() => state.value.inviteCode)
const isSubmitting = computed(() => isAddFederationSubmitting(state.value))
const previewFederation = computed(() => getAddFederationPreview(state.value))
const step = computed(() => getAddFederationStep(state.value))
const dialogTitle = computed(() => {
  return step.value === 'preview' ? 'Review Federation' : 'Join Federation'
})

watch(
  () => [props.initialInviteCode, props.initialPreviewFederation] as const,
  async ([newCode, newPreview]) => {
    state.value = resolveInitialAddFederationState({
      initialInviteCode: newCode,
      initialPreviewFederation: newPreview,
    })

    if (newCode != null && newCode !== '' && newPreview == null && props.autoPreview === true) {
      await loadPreview()
    }
  },
  { immediate: true },
)

function updateInviteCode(value: string | number | null) {
  state.value = resolveInviteCodeUpdate(state.value, value)
}

function onClose() {
  emit('close')
}

function goBackToInviteStep() {
  if (props.backTarget === 'discover') {
    emit('back')
    return
  }
  state.value = returnToInviteStep(state.value)
}

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    logger.ui.debug('Federation invite code pasted from clipboard', { text })
    state.value = resolveInviteCodeUpdate(state.value, text)
  } catch (error) {
    logger.ui.error('Failed to read clipboard for federation invite code', error)
    notify.notify({
      type: 'negative',
      message: `Unable to access clipboard ${getErrorMessage(error)}`,
    })
  }
}

async function loadPreview() {
  const cleanInviteCode = state.value.inviteCode.trim()
  if (cleanInviteCode === '') {
    return
  }

  logger.federation.debug('Previewing federation', { inviteCode: cleanInviteCode })

  if (federationStore.federations.some((f) => f.inviteCode === cleanInviteCode)) {
    notify.notify({
      message: 'Federation already exists',
      color: 'negative',
      icon: 'error',
      timeout: 5000,
    })
    return
  }

  const requestId = previewRequestId + 1
  previewRequestId = requestId
  activeLoadingRequestId = requestId
  state.value = startPreview(state.value, requestId)
  Loading.show({ message: 'Loading federation preview' })

  try {
    const federation = await walletStore.previewFederation(cleanInviteCode)
    logger.federation.debug('Federation preview', { federation })
    state.value = resolvePreviewSuccess(state.value, {
      requestId,
      inviteCode: cleanInviteCode,
      federation,
    })
  } catch (error) {
    const message = getErrorMessage(error)
    const nextState = resolvePreviewFailure(state.value, {
      requestId,
      inviteCode: cleanInviteCode,
      message,
    })
    if (nextState !== state.value) {
      state.value = nextState
      notify.notify({
        message: `Failed to preview federation: ${message}`,
        color: 'negative',
        icon: 'error',
        timeout: 5000,
      })
    }
  } finally {
    if (activeLoadingRequestId === requestId) {
      activeLoadingRequestId = null
      Loading.hide()
    }
  }
}

async function addFederation() {
  const federation = getAddFederationPreview(state.value)
  if (federation == null) {
    return
  }

  Loading.show({ message: 'Joining Federation' })
  state.value = startJoin(state.value)

  try {
    federationStore.addFederation(federation)
    try {
      await federationStore.selectFederation(federation)
    } catch (error) {
      federationStore.deleteFederation(federation.federationId)
      throw error
    }
  } catch (error) {
    notify.notify({
      message: `Failed to join federation: ${getErrorMessage(error)}`,
      color: 'negative',
      icon: 'error',
      timeout: 5000,
    })
    state.value = resolveJoinFailure(state.value)
    return
  } finally {
    Loading.hide()
  }

  onClose()
}
</script>

<style scoped>
.add-federation-submit {
  width: 100%;
}
</style>
