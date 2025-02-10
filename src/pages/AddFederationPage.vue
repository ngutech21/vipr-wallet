<template>
  <q-card class="q-px-md q-pt-md q-pb-xl">
    <q-card-section>
      <div class="text-h6">Add Federation</div>
    </q-card-section>

    <div class="q-pa-md">
      <q-input filled v-model="inviteCode" label="Federation invite code" />
      <q-input filled v-model="federationName" label="Name" />
      <q-btn label="Add Federation" color="primary" class="q-mt-md" @click="addFederation" />
    </div>

    <q-card-section>
      <q-btn label="Close" color="primary" v-close-popup />
    </q-card-section>
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
/* ...optional custom styles... */
</style>
