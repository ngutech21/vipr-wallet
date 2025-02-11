<template>
  <ModalCard title="Add Federation">
    <q-form ref="federationForm" class="q-pa-md">
      <q-input
        filled
        v-model="inviteCode"
        label="Federation Invitecode"
        :rules="[(val) => !!val || 'Invitecode is required']"
      />
      <q-input
        filled
        v-model="federationName"
        label="Name"
        class="q-mt-md"
        :rules="[(val) => !!val || 'Name is required']"
      />
      <q-btn
        type="submit"
        label="Add Federation"
        color="primary"
        class="q-mt-md"
        @click="addFederation"
      />
    </q-form>
  </ModalCard>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useWalletStore } from 'src/stores/wallet'
import { useFederationStore } from 'src/stores/federation'
import type { Federation } from 'src/components/models'
import ModalCard from 'src/components/ModalCard.vue'

const inviteCode = ref('')
const federationName = ref('')
const walletStore = useWalletStore()
const federationStore = useFederationStore()

async function addFederation() {
  console.log('Adding federation:', inviteCode.value)
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
}
</script>

<style scoped></style>
