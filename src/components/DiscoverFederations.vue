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
          @click="discoverFederations(true)"
        />
      </div>

      <q-list bordered separator v-if="visibleFederations.length > 0">
        <q-item
          v-for="federation in visibleFederations"
          :key="federation.inviteCode"
          clickable
          @click="addFederation(federation)"
          :disable="isAdded(federation) || !federation.previewReady"
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
            <q-item-label caption class="federation-id">
              {{ federation.federationId }}
            </q-item-label>
            <q-item-label
              v-if="!federation.previewReady"
              caption
              class="federation-loading-caption"
            >
              Loading federation details...
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-spinner v-if="!federation.previewReady" color="primary" size="18px" />
            <q-btn
              v-else
              flat
              round
              :icon="isAdded(federation) ? 'check_circle' : 'add'"
              :color="isAdded(federation) ? 'positive' : 'primary'"
              :disable="isAdded(federation)"
            />
          </q-item-section>
        </q-item>
      </q-list>

      <div class="text-center q-mt-md" v-if="canLoadMore">
        <q-btn
          unelevated
          color="primary"
          text-color="white"
          no-caps
          label="Load more"
          icon="expand_more"
          @click="loadMoreFederations"
        />
      </div>

      <div
        v-if="!isDiscovering && visibleFederations.length === 0"
        class="text-center q-pa-lg text-grey-7"
      >
        <div class="text-caption">No federations discovered yet.</div>
      </div>

      <div
        v-if="isDiscovering && visibleFederations.length === 0"
        class="text-center q-pa-lg text-grey-7"
      >
        <div class="loading-container">
          <q-spinner color="primary" size="2em" />
          <div class="text-caption q-mt-xs">Searching...</div>
        </div>
      </div>

      <div
        v-if="showDiscoveryStatus"
        class="discovery-status row items-center justify-between q-mt-md"
      >
        <div class="row items-center text-caption text-grey-7">
          <q-spinner v-if="isDiscovering" color="primary" size="16px" class="q-mr-sm" />
          <span>{{ discoveryStatusText }}</span>
        </div>
        <q-btn
          v-if="isDiscovering"
          flat
          dense
          no-caps
          color="primary"
          label="Stop"
          @click="stopDiscovery"
        />
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

type DiscoveryListItem = Federation & {
  previewReady: boolean
}

const nostr = useNostrStore()
const federationStore = useFederationStore()
const isDiscovering = computed(() => nostr.isDiscoveringFederations)
const visibleFederations = computed<DiscoveryListItem[]>(() => {
  const discoveredById = new Map(
    nostr.discoveredFederations.map((federation) => [federation.federationId, federation]),
  )
  const candidatesById = new Map(
    nostr.discoveryCandidates.map((candidate) => [candidate.federationId, candidate]),
  )
  const orderedFederationIds = [
    ...nostr.discoveryCandidates.map((candidate) => candidate.federationId),
    ...nostr.discoveredFederations.map((federation) => federation.federationId),
  ]
  const seenIds = new Set<string>()
  const entries: DiscoveryListItem[] = []

  for (const federationId of orderedFederationIds) {
    if (seenIds.has(federationId)) {
      continue
    }
    seenIds.add(federationId)

    const discovered = discoveredById.get(federationId)
    if (discovered != null) {
      entries.push({
        ...discovered,
        previewReady: true,
      })
      if (entries.length >= nostr.previewTargetCount) {
        break
      }
      continue
    }

    const candidate = candidatesById.get(federationId)
    if (candidate == null) {
      continue
    }

    entries.push({
      title: `Federation ${truncateFederationId(candidate.federationId)}`,
      federationId: candidate.federationId,
      inviteCode: candidate.inviteCode,
      modules: [],
      metadata: {},
      previewReady: false,
    })

    if (entries.length >= nostr.previewTargetCount) {
      break
    }
  }

  return entries
})
const showDiscoveryStatus = computed(() => {
  return visibleFederations.value.length > 0
})
const discoveryStatusText = computed(() => {
  const loaded = nostr.discoveredFederations.length
  if (isDiscovering.value) {
    return `${loaded} loaded, live updates on`
  }
  return `${loaded} loaded`
})
const canLoadMore = computed(() => {
  return nostr.discoveryCandidates.length > nostr.previewTargetCount
})

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

async function discoverFederations(reset = false) {
  try {
    await nostr.discoverFederations({ reset })
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

function loadMoreFederations() {
  nostr.increasePreviewTarget()
}

function stopDiscovery() {
  nostr.stopDiscoveringFederations()
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

    nostr.setJoinInProgress(true)
    const queueIdle = await nostr.waitForPreviewQueueIdle()
    if (!queueIdle) {
      logger.warn('Preview queue still busy while joining federation')
    }

    federationStore.addFederation(federation)
    try {
      await federationStore.selectFederation(federation)
    } catch (error) {
      federationStore.deleteFederation(federation.federationId)
      throw error
    }

    Notify.create({
      message: 'Federation added successfully',
      color: 'positive',
      icon: 'check',
      position: 'top',
      timeout: 3000,
    })
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
    nostr.setJoinInProgress(false)
    Loading.hide()
  }
}

function truncateFederationId(federationId: string): string {
  if (federationId.length <= 12) {
    return federationId
  }
  return `${federationId.slice(0, 6)}...${federationId.slice(-4)}`
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

.federation-loading-caption {
  color: rgba(255, 255, 255, 0.45);
}

/* Enhance the loading state */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
}

.discovery-status {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 12px;
}
</style>
