<template>
  <ModalCard title="Add Federation">
    <q-form ref="federationForm" class="q-pa-md" @submit.prevent="addFederation">
      <q-input
        filled
        v-model="inviteCode"
        label="Enter Fedimint Invitecode"
        :rules="[(val) => !!val || 'Invitecode is required']"
        type="textarea"
      />

      <div class="row justify-between full-width q-mt-none">
        <q-btn
          flat
          label="Scan QR"
          icon="qr_code_scanner"
          color="primary"
          :to="'/scan'"
          class="q-pl-none"
        />
        <q-btn
          flat
          label="Paste"
          icon="content_paste"
          color="primary"
          @click="pasteFromClipboard"
          class="q-pr-none"
        />
      </div>
      <div class="q-mt-xl">
        <q-btn type="submit" label="Add Federation" color="primary" class="q-mt-md full-width" />
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

const walletStore = useWalletStore()
const federationStore = useFederationStore()

const emit = defineEmits<{
  close: []
}>()

const props = defineProps<{
  initialInviteCode?: string | null
}>()

// Change to initialize from prop if available
const inviteCode = ref(props.initialInviteCode || '')

// Watch for changes to the prop to update the local ref
watch(
  () => props.initialInviteCode,
  (newCode) => {
    if (newCode) {
      inviteCode.value = newCode
    }
  },
)

function onClose() {
  emit('close')
}

async function pasteFromClipboard() {
  await navigator.clipboard.readText().then((text) => {
    console.log('Pasted from clipboard:', text)
    inviteCode.value = text
  })
}

async function addFederation() {
  Loading.show({ message: 'Adding Federation' })

  try {
    console.log('Adding federation:', inviteCode.value)

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
    const federation = await walletStore.getFederationByInviteCode(inviteCode.value)
    if (federation) {
      const meta = await walletStore.getMetadata(federation)
      // FIXME is this redundant?
      federation.metadata = meta || {}
      federationStore.addFederation(federation)
      await federationStore.selectFederation(federation)
    }
  } catch (error) {
    Notify.create({
      message: `Failed to add federation: ${getErrorMessage(error)}`,
      color: 'negative',
      icon: 'error',
      timeout: 5000,
      position: 'top',
    })
  } finally {
    Loading.hide()
    onClose()
  }
}
</script>

<style scoped></style>
