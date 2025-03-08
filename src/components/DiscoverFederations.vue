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
            <q-img :src="federation.icon_url" class="logo" loading="eager" />
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

      <div class="text-center q-pa-lg text-grey-7">
        <div v-if="isDiscovering" class="q-mt-md">
          <q-spinner color="primary" size="2em" />
          <div class="text-caption q-mt-xs">Searching...</div>
        </div>
      </div>
    </div>
  </ModalCard>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useNostrStore } from 'src/stores/nostr'
import { useFederationStore } from 'src/stores/federation'
import { useWalletStore } from 'src/stores/wallet'
import ModalCard from 'src/components/ModalCard.vue'
import { Loading, Notify } from 'quasar'
import type { Federation } from 'src/components/models'
import { getErrorMessage } from 'src/utils/error'

const nostr = useNostrStore()
const walletStore = useWalletStore()
const federationStore = useFederationStore()
const isDiscovering = computed(() => nostr.isDiscoveringFederations)

const emit = defineEmits<{
  close: []
}>()

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
})

watch(
  () => props.visible,
  async (isVisible) => {
    if (isVisible) {
      await discoverFederations()
    }
  },
  { immediate: true },
)

// Add function to check if federation is already added
function isAdded(federation: Federation): boolean {
  return federationStore.federations.some((f) => f.federationId === federation.federationId)
}

async function discoverFederations() {
  try {
    await nostr.discoverFederations()
  } catch (error) {
    console.error('Failed to discover federations:', error)
    Notify.create({
      message: `Failed to discover federations ${getErrorMessage(error)}`,
      color: 'negative',
      icon: 'error',
      position: 'top',
    })
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

    const validFederation = await walletStore.getFederationByInviteCode(federation.inviteCode)
    if (validFederation) {
      const meta = await walletStore.getMetadata(validFederation)
      validFederation.icon_url = meta?.federation_icon_url ?? ''
      if (meta) {
        validFederation.metadata = meta
      }

      federationStore.addFederation(validFederation)
      await federationStore.selectFederation(validFederation)

      Notify.create({
        message: 'Federation added successfully',
        color: 'positive',
        icon: 'check',
        position: 'top',
        timeout: 3000,
      })
      emit('close')
    }
  } catch (error) {
    console.error('Failed to add federation:', error)
    Notify.create({
      message: `Failed to add federation: ${getErrorMessage(error)}`,
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
