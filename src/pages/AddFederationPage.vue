<template>
  <ModalCard title="Add Federation">
    <q-form ref="federationForm" class="q-pa-md" @submit.prevent="addFederation">
      <q-input
        filled
        v-model="federationName"
        label="Enter Federation Name"
        class="q-mt-md"
        :rules="[(val) => !!val || 'Name is required']"
      />
      <q-input
        filled
        v-model="inviteCode"
        label="Enter Fedimint Invitecode"
        :rules="[(val) => !!val || 'Invitecode is required']"
        type="textarea"
      />

      <div class="row justify-between full-width">
        <q-btn flat label="Scan" icon="qr_code_scanner" color="primary" :to="'/scan'" />
        <q-btn
          flat
          label="Paste"
          icon="content_paste"
          color="primary"
          @click="pasteFromClipboard"
        />
      </div>
      <div class="row items-center justify-evenly q-gutter-md q-mt-md">
        <q-btn type="submit" label="Add Federation" color="primary" class="q-mt-md" />
      </div>
    </q-form>
  </ModalCard>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useWalletStore } from 'src/stores/wallet'
import { useFederationStore } from 'src/stores/federation'
import type { Federation } from 'src/components/models'
import ModalCard from 'src/components/ModalCard.vue'
import { Loading, Notify } from 'quasar'

const emit = defineEmits<{
  close: []
}>()

function onClose() {
  emit('close')
}
const inviteCode = ref('')
const federationName = ref('')
const walletStore = useWalletStore()
const federationStore = useFederationStore()

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
    const federationId = await walletStore.isValidInviteCode(inviteCode.value)
    console.log('Federation ID:', federationId)
    if (federationId) {
      const federation: Federation = {
        title: federationName.value,
        federationId: federationId,
        inviteCode: inviteCode.value,
      }
      await federationStore.addFederation(federation)
      await federationStore.selectFederation(federation)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    Notify.create({
      message: 'Failed to add federation: ' + errorMessage,
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
