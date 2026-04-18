<template>
  <ModalCard :title="dialogTitle" data-testid="add-federation-form">
    <JoinFederationInviteStep
      v-if="step === 'invite'"
      :invite-code="inviteCode"
      :is-submitting="isSubmitting"
      @update:invite-code="updateInviteCode"
      @paste="pasteFromClipboard"
      @submit="loadPreview"
    />

    <JoinFederationPreviewStep
      v-else-if="previewFederation != null"
      :federation="previewFederation"
      :import-amount-sats="importAmountSats ?? null"
      :is-submitting="isSubmitting"
      @back="goBackToInviteStep"
      @join="addFederation"
    />
  </ModalCard>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useWalletStore } from 'src/stores/wallet'
import { useFederationStore } from 'src/stores/federation'
import type { Federation } from 'src/components/models'
import ModalCard from 'src/components/ModalCard.vue'
import JoinFederationInviteStep from 'src/components/JoinFederationInviteStep.vue'
import JoinFederationPreviewStep from 'src/components/JoinFederationPreviewStep.vue'
import { Loading } from 'quasar'
import { useAppNotify } from 'src/composables/useAppNotify'
import { getErrorMessage } from 'src/utils/error'
import { logger } from 'src/services/logger'

const walletStore = useWalletStore()
const federationStore = useFederationStore()
const notify = useAppNotify()

const emit = defineEmits<{
  close: []
}>()

const props = defineProps<{
  initialInviteCode?: string | null
  autoPreview?: boolean
  importAmountSats?: number | null
}>()

const inviteCode = ref(props.initialInviteCode ?? '')
const isSubmitting = ref(false)
const previewFederation = ref<Federation | null>(null)
const step = ref<'invite' | 'preview'>('invite')

const dialogTitle = computed(() => {
  return step.value === 'preview' ? 'Preview Federation' : 'Join Federation'
})

watch(
  () => props.initialInviteCode,
  async (newCode) => {
    if (newCode != null && newCode !== '') {
      inviteCode.value = newCode
      previewFederation.value = null
      step.value = 'invite'
      if (props.autoPreview === true) {
        await loadPreview()
      }
    }
  },
  { immediate: true },
)

function updateInviteCode(value: string | number | null) {
  inviteCode.value = typeof value === 'string' ? value : ''
  previewFederation.value = null
}

function onClose() {
  emit('close')
}

function goBackToInviteStep() {
  step.value = 'invite'
}

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    logger.ui.debug('Federation invite code pasted from clipboard', { text })
    inviteCode.value = text
  } catch (error) {
    logger.ui.error('Failed to read clipboard for federation invite code', error)
    notify.notify({
      type: 'negative',
      message: `Unable to access clipboard ${getErrorMessage(error)}`,
    })
  }
}

async function loadPreview() {
  Loading.show({ message: 'Loading federation preview' })
  isSubmitting.value = true

  try {
    const cleanInviteCode = inviteCode.value.trim()
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

    const federation = await walletStore.previewFederation(cleanInviteCode)
    logger.federation.debug('Federation preview', { federation })
    if (federation != null) {
      previewFederation.value = federation
      step.value = 'preview'
    }
  } catch (error) {
    notify.notify({
      message: `Failed to preview federation: ${getErrorMessage(error)}`,
      color: 'negative',
      icon: 'error',
      timeout: 5000,
    })
  } finally {
    isSubmitting.value = false
    Loading.hide()
  }
}

async function addFederation() {
  const federation = previewFederation.value
  if (federation == null) {
    return
  }

  Loading.show({ message: 'Joining Federation' })
  isSubmitting.value = true

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
    return
  } finally {
    isSubmitting.value = false
    Loading.hide()
  }

  onClose()
}
</script>
