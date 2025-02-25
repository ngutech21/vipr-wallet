<template>
  <ModalCard title="Discover Federations">
    <div class="q-pa-md">
      <div class="row items-center justify-between q-mb-md">
        <div class="text-subtitle1">Available Federations</div>
        <q-btn
          flat
          round
          icon="refresh"
          color="primary"
          :loading="isDiscovering"
          @click="discoverFederations"
        />
      </div>

      <q-list bordered separator v-if="nostr.discoveredFederations.length > 0">
        <q-item
          v-for="federation in nostr.discoveredFederations"
          :key="federation.inviteCode"
          clickable
          @click="addFederation(federation)"
          :disable="isAdded(federation)"
        >
          <q-item-section avatar v-if="federation.icon_url">
            <q-img :src="federation.icon_url" class="logo" />
          </q-item-section>
          <template v-else>
            <q-avatar color="grey-3" text-color="grey-7" class="logo q-mr-md">
              <q-icon name="account_balance" />
            </q-avatar>
          </template>
          <q-item-section>
            <q-item-label>{{ federation.title }}</q-item-label>
            <q-item-label caption class="federation-id">{{ federation.federationId }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn
              flat
              round
              :icon="isAdded(federation) ? 'check_circle' : 'add'"
              :color="isAdded(federation) ? 'positive' : 'primary'"
              :disable="isAdded(federation)"
            />
          </q-item-section>
        </q-item>
      </q-list>

      <div v-else class="text-center q-pa-lg text-grey-7">
        <q-icon name="search" size="48px" />
        <div class="text-body1 q-mt-sm">No federations discovered yet</div>
        <q-btn
          label="Discover Federations"
          color="primary"
          class="q-mt-md"
          :loading="isDiscovering"
          @click="discoverFederations"
        />
      </div>
    </div>
  </ModalCard>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useNostrStore } from 'src/stores/nostr'
import { useFederationStore } from 'src/stores/federation'
import { useWalletStore } from 'src/stores/wallet'
import ModalCard from 'src/components/ModalCard.vue'
import { Loading, Notify } from 'quasar'
import type { Federation } from 'src/components/models'

const emit = defineEmits<{
  close: []
}>()

const nostr = useNostrStore()
const walletStore = useWalletStore()
const federationStore = useFederationStore()
const isDiscovering = ref(false)

onMounted(async () => {
  await discoverFederations()
})

// Add function to check if federation is already added
function isAdded(federation: Federation): boolean {
  return federationStore.federations.some((f) => f.federationId === federation.federationId)
}

async function discoverFederations() {
  isDiscovering.value = true
  try {
    await nostr.discoverFederations()
  } catch (error) {
    console.error('Failed to discover federations:', error)
    Notify.create({
      message: 'Failed to discover federations',
      color: 'negative',
      icon: 'error',
    })
  } finally {
    isDiscovering.value = false
  }
}

async function addFederation(federation: Federation) {
  Loading.show({ message: 'Adding Federation' })

  try {
    if (federationStore.federations.some((f) => f.inviteCode === federation.inviteCode)) {
      Notify.create({
        message: 'Federation already exists',
        color: 'negative',
        icon: 'error',
        timeout: 5000,
        position: 'top',
      })
      return
    }

    const validFederation = await walletStore.isValidInviteCode(federation.inviteCode)
    if (validFederation) {
      const meta = await walletStore.getMetadata(validFederation)
      validFederation.icon_url = meta?.federation_icon_url ?? ''

      federationStore.addFederation(validFederation)
      await federationStore.selectFederation(validFederation)

      Notify.create({
        message: 'Federation added successfully',
        color: 'positive',
        icon: 'check',
        position: 'top',
      })
      emit('close')
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
  }
}
</script>

<style scoped>
.federation-id {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.logo {
  width: 40px;
  height: 40px;
}
</style>
