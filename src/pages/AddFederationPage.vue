<template>
  <q-card class="full-width">
    <q-card-section class="row items-center justify-between">
      <div class="text-h6">Add Federation</div>
      <q-btn icon="close" flat round dense v-close-popup color="primary" />
    </q-card-section>

    <q-separator />

    <div class="q-pa-md">
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
      <q-btn label="Add Federation" color="primary" class="q-mt-md" @click="addFederation" />
    </div>
  </q-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useWalletStore } from 'src/stores/wallet'
import { useFederationStore } from 'src/stores/federation'
import type { Federation } from 'src/components/models'

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

<style scoped>
.full-width {
  width: 100%;
}
.q-dialog__inner--minimized > div {
  max-width: 100%;
}
</style>
