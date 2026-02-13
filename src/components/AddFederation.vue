<template>
  <ModalCard title="Join Federation" data-testid="add-federation-form">
    <q-form ref="federationForm" class="q-pa-md" @submit.prevent="addFederation">
      <q-input
        filled
        v-model="inviteCode"
        label="Enter Fedimint Invitecode"
        :rules="[(val) => !!val || 'Invitecode is required']"
        type="textarea"
        data-testid="invite-code-input"
      />

      <div class="row justify-between full-width q-mt-none">
        <q-btn
          flat
          label="Scan QR"
          icon="qr_code_scanner"
          color="primary"
          :to="'/scan'"
          class="q-pl-none"
          data-testid="add-federation-scan-btn"
        />
        <q-btn
          flat
          label="Paste"
          icon="content_paste"
          color="primary"
          @click="pasteFromClipboard"
          class="q-pr-none"
          data-testid="add-federation-paste-btn"
        />
      </div>
      <div class="q-mt-xl">
        <q-btn
          type="submit"
          label="Join Federation"
          color="primary"
          class="q-mt-md full-width"
          data-testid="add-federation-submit-btn"
          :disable="isSubmitting"
          :loading="isSubmitting"
          :data-busy="isSubmitting ? 'true' : 'false'"
        />
      </div>
    </q-form>
  </ModalCard>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useWalletStore } from 'src/stores/wallet'
import { useFederationStore } from 'src/stores/federation'
import ModalCard from 'src/components/ModalCard.vue'
import { Loading, Notify } from 'quasar'
import { getErrorMessage } from 'src/utils/error'
import { logger } from 'src/services/logger'

const walletStore = useWalletStore()
const federationStore = useFederationStore()

const emit = defineEmits<{
  close: []
}>()

const props = defineProps<{
  initialInviteCode?: string | null
}>()

// Change to initialize from prop if available
const inviteCode = ref(props.initialInviteCode ?? '')
const isSubmitting = ref(false)

// Watch for changes to the prop to update the local ref
watch(
  () => props.initialInviteCode,
  (newCode) => {
    if (newCode != null && newCode !== '') {
      inviteCode.value = newCode
    }
  },
)

function onClose() {
  emit('close')
}

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText()
    logger.ui.debug('Federation invite code pasted from clipboard', { text })
    inviteCode.value = text
  } catch (error) {
    logger.ui.error('Failed to read clipboard for federation invite code', error)
    Notify.create({
      type: 'negative',
      message: `Unable to access clipboard ${getErrorMessage(error)}`,
      position: 'top',
    })
  }
}

async function addFederation() {
  Loading.show({ message: 'Joining Federation' })
  isSubmitting.value = true

  try {
    logger.federation.debug('Joining federation', { inviteCode: inviteCode.value })

    if (federationStore.federations.some((f) => f.inviteCode === inviteCode.value)) {
      Notify.create({
        message: 'Federation already exists',
        color: 'negative',
        icon: 'error',
        timeout: 5000,
        position: 'top',
      })
      return
    }
    const federation = await walletStore.previewFederation(inviteCode.value)
    logger.federation.debug('Federation preview', { federation })
    if (federation != null) {
      const meta = await walletStore.getMetadata(federation)
      // FIXME is this redundant?
      federation.metadata = meta ?? {}
      federationStore.addFederation(federation)
      try {
        await federationStore.selectFederation(federation)
      } catch (error) {
        federationStore.deleteFederation(federation.federationId)
        throw error
      }
    }
  } catch (error) {
    Notify.create({
      message: `Failed to join federation: ${getErrorMessage(error)}`,
      color: 'negative',
      icon: 'error',
      timeout: 5000,
      position: 'top',
    })
  } finally {
    isSubmitting.value = false
    Loading.hide()
    onClose()
  }
}
</script>

<style scoped></style>
