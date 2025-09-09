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
          <q-item-section avatar v-if="federation?.metadata?.federation_icon_url">
            <q-img :src="federation?.metadata?.federation_icon_url" class="logo" />
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
        <div v-if="isDiscovering" class="loading-container">
          <q-spinner color="primary" size="2em" />
          <div class="text-caption q-mt-xs">Searching...</div>
        </div>
      </div>
    </div>
  </ModalCard>
</template>

<script setup lang="ts">
import { computed, watch, onUnmounted } from 'vue'
import { useNostrStore } from 'src/stores/nostr'
import { useFederationStore } from 'src/stores/federation'
import ModalCard from 'src/components/ModalCard.vue'
import { Loading, Notify } from 'quasar'
import type { Federation } from 'src/components/models'
import { getErrorMessage } from 'src/utils/error'
import { logger } from 'src/services/logger'

const nostr = useNostrStore()
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
    } else {
      nostr.stopDiscoveringFederations()
    }
  },
  { immediate: true },
)

// Add function to check if federation is already added
function isAdded(federation: Federation): boolean {
  return federationStore.federations.some((f) => f.federationId === federation.federationId)
}

// Cleanup when component is unmounted
onUnmounted(() => {
  nostr.stopDiscoveringFederations()
})

async function discoverFederations() {
  try {
    await nostr.discoverFederations()
  } catch (error) {
    logger.error('Failed to discover federations', error)
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
    if (federationStore.federations.some((f) => f.federationId === federation.federationId)) {
      Notify.create({
        message: 'Federation already exists',
        color: 'negative',
        icon: 'error',
        timeout: 5000,
        position: 'top',
      })
      return
    }

    federationStore.addFederation(federation)
    await federationStore.selectFederation(federation)

    Notify.create({
      message: 'Federation added successfully',
      color: 'positive',
      icon: 'check',
      position: 'top',
      timeout: 3000,
    })
    nostr.stopDiscoveringFederations()
    emit('close')
  } catch (error) {
    logger.error('Failed to add federation', error)
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
/* .federation-id {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.logo {
  width: 40px;
  height: 40px;
} */

.q-list {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px !important;
  border: none !important;
}

.q-item {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07) !important;
  transition: background-color 0.2s ease;
}

.q-item:hover {
  background-color: rgba(255, 255, 255, 0.08);
}

.q-item:last-child {
  border-bottom: none !important;
}

/* Create better transitions for interactive elements */
.q-item,
.q-btn {
  transition:
    transform 0.2s,
    background-color 0.2s;
}

.q-item:active {
  transform: translateY(1px);
}

/* Improve logo styling */
.logo {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Improve text styling */
.federation-id {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.8rem;
}

/* Enhance the loading state */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
}
</style>
