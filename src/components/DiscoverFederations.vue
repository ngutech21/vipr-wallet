<template>
  <ModalCard title="Discover Federations">
    <div class="q-pa-md">
      <q-list bordered separator v-if="visibleFederations.length > 0">
        <q-item
          v-for="federation in visibleFederations"
          :key="federation.federationId"
          clickable
          @click="openFederationPreview(federation)"
          :disable="isAdded(federation)"
          :data-testid="`discover-federation-item-${federation.federationId}`"
        >
          <q-item-section avatar v-if="federation.pictureUrl != null">
            <q-img :src="federation.pictureUrl" class="logo" />
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
            <q-item-label v-if="federation.about" caption class="federation-about-caption">
              {{ federation.about }}
            </q-item-label>
            <q-item-label
              v-if="federation.recommendationCount > 0"
              caption
              class="federation-recommendation-caption"
            >
              Recommended by {{ formatRecommendationCount(federation.recommendationCount) }}
            </q-item-label>
            <q-item-label
              v-if="federation.previewStatus === 'loading'"
              caption
              class="federation-loading-caption"
            >
              Loading federation details...
            </q-item-label>
            <q-item-label
              v-else-if="federation.previewStatus === 'failed'"
              caption
              class="federation-error-caption"
            >
              Federation details unavailable.
            </q-item-label>
            <q-item-label
              v-else-if="federation.previewStatus === 'timed_out'"
              caption
              class="federation-error-caption"
            >
              Federation details request timed out.
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-spinner v-if="federation.previewStatus === 'loading'" color="primary" size="18px" />
            <q-icon
              v-else-if="
                federation.previewStatus === 'failed' || federation.previewStatus === 'timed_out'
              "
              name="warning"
              color="warning"
              size="18px"
            />
            <q-btn
              v-else
              flat
              round
              :icon="isAdded(federation) ? 'check_circle' : 'visibility'"
              :color="isAdded(federation) ? 'positive' : 'primary'"
              :disable="isAdded(federation)"
              :aria-label="isAdded(federation) ? 'Federation already added' : 'Preview federation'"
              :title="isAdded(federation) ? 'Federation already added' : 'Preview federation'"
              :data-testid="`discover-federation-action-${federation.federationId}`"
              @click.stop="openFederationPreview(federation)"
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
          data-testid="discover-federations-load-more-btn"
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

      <div class="discovery-status row items-center justify-between q-mt-md">
        <div class="row items-center text-caption text-grey-7">
          <q-spinner v-if="isDiscovering" color="primary" size="16px" class="q-mr-sm" />
          <span>{{ discoveryStatusText }}</span>
        </div>
        <q-btn
          flat
          dense
          no-caps
          color="primary"
          :label="isDiscovering ? 'Stop' : 'Start'"
          @click="toggleDiscovery"
          data-testid="discover-federations-toggle-btn"
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
import { useAppNotify } from 'src/composables/useAppNotify'
import type { DiscoverySelectionPayload, Federation } from 'src/types/federation'
import { getErrorMessage } from 'src/utils/error'
import { logger } from 'src/services/logger'

type DiscoveryListItem = Federation & {
  previewReady: boolean
  recommendationCount: number
  previewStatus: 'loading' | 'failed' | 'timed_out' | 'ready'
  about?: string
  pictureUrl?: string
  prefetchedFederation?: Federation
}

const nostr = useNostrStore()
const federationStore = useFederationStore()
const notify = useAppNotify()
const isDiscovering = computed(() => nostr.isDiscoveringFederations)
const visibleFederations = computed<DiscoveryListItem[]>(() => {
  return nostr.discoveryCandidates.slice(0, nostr.previewTargetCount).map((candidate) => {
    const prefetchedFederation = nostr.getCachedPreviewForCandidate(candidate)
    const recommendationCount = Math.max(
      candidate.recommendationCount ?? 0,
      nostr.getRecommendationCountForFederationId(candidate.federationId),
    )
    const previewStatus =
      prefetchedFederation != null
        ? 'ready'
        : (nostr.getPreviewStatusForFederationId(candidate.federationId) ?? 'loading')

    return {
      title:
        prefetchedFederation?.title ??
        candidate.displayName ??
        `Federation ${truncateFederationId(candidate.federationId)}`,
      federationId: candidate.federationId,
      inviteCode: candidate.inviteCode,
      modules: prefetchedFederation?.modules ?? [],
      guardians: prefetchedFederation?.guardians ?? [],
      metadata: prefetchedFederation?.metadata ?? {},
      previewReady: prefetchedFederation != null,
      recommendationCount,
      previewStatus,
      ...(prefetchedFederation?.metaUrl != null ? { metaUrl: prefetchedFederation.metaUrl } : {}),
      ...(prefetchedFederation?.network != null
        ? { network: prefetchedFederation.network }
        : candidate.network != null
          ? { network: candidate.network }
          : {}),
      ...(candidate.about != null ? { about: candidate.about } : {}),
      ...(prefetchedFederation?.metadata?.federation_icon_url != null
        ? { pictureUrl: prefetchedFederation.metadata.federation_icon_url }
        : candidate.pictureUrl != null
          ? { pictureUrl: candidate.pictureUrl }
          : {}),
      ...(prefetchedFederation != null ? { prefetchedFederation } : {}),
    }
  })
})
const discoveryStatusText = computed(() => {
  const loaded = nostr.discoveredFederations.length
  if (isDiscovering.value) {
    return `${loaded} loaded, live updates on`
  }
  return `${loaded} loaded, updates paused`
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

const emit = defineEmits<{
  close: []
  showAdd: [payload: DiscoverySelectionPayload]
}>()

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
    notify.notify({
      message: `Failed to discover federations ${getErrorMessage(error)}`,
      color: 'negative',
      icon: 'error',
    })
  }
}

function loadMoreFederations() {
  nostr.increasePreviewTarget()
}

function stopDiscovery() {
  nostr.stopDiscoveringFederations()
}

async function toggleDiscovery() {
  if (isDiscovering.value) {
    stopDiscovery()
    return
  }
  await discoverFederations()
}

function formatRecommendationCount(count: number): string {
  const suffix = count === 1 ? 'user' : 'users'
  return `${count} ${suffix}`
}

function openFederationPreview(federation: DiscoveryListItem) {
  if (federationStore.federations.some((f) => f.federationId === federation.federationId)) {
    notify.notify({
      message: 'Federation already exists',
      color: 'negative',
      icon: 'error',
      timeout: 5000,
    })
    return
  }

  emit('close')
  emit(
    'showAdd',
    federation.prefetchedFederation != null
      ? {
          inviteCode: federation.inviteCode,
          prefetchedFederation: federation.prefetchedFederation,
        }
      : {
          inviteCode: federation.inviteCode,
        },
  )
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

.federation-about-caption {
  color: rgba(255, 255, 255, 0.6);
}

.federation-recommendation-caption {
  color: rgba(255, 255, 255, 0.7);
}

.federation-error-caption {
  color: rgba(255, 193, 7, 0.9);
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
