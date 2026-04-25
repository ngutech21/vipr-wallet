<template>
  <ModalCard title="Discover Federations" @close="emit('close')">
    <div class="discover-sheet">
      <q-list
        v-if="visibleFederations.length > 0"
        class="discover-list vipr-surface-card vipr-surface-card--list"
      >
        <q-item
          v-for="federation in visibleFederations"
          :key="federation.federationId"
          clickable
          class="discover-row"
          @click="openFederationPreview(federation)"
          :disable="isAdded(federation)"
          :data-testid="`discover-federation-item-${federation.federationId}`"
        >
          <q-item-section avatar v-if="federation.pictureUrl != null">
            <q-img :src="federation.pictureUrl" class="logo" />
          </q-item-section>
          <template v-else>
            <q-avatar color="grey-3" text-color="grey-7" class="logo logo--fallback">
              <q-icon name="account_balance" />
            </q-avatar>
          </template>
          <q-item-section>
            <q-item-label class="federation-title">
              <span class="federation-title__text">{{ federation.title }}</span>
              <q-badge
                v-if="isAdded(federation)"
                outline
                class="federation-title__badge vipr-chip vipr-chip--muted"
              >
                Added
              </q-badge>
            </q-item-label>
            <q-item-label v-if="federationSummary(federation)" caption class="federation-summary">
              {{ federationSummary(federation) }}
            </q-item-label>
            <q-item-label
              v-if="federation.recommendationCount > 0"
              caption
              class="federation-recommendation"
            >
              Recommended by {{ formatRecommendationCount(federation.recommendationCount) }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-btn
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

      <div
        v-if="!isDiscovering && visibleFederations.length === 0"
        class="vipr-empty-state vipr-empty-state--inline discover-empty-state"
      >
        <div class="vipr-caption">No federations discovered yet.</div>
      </div>

      <div
        v-if="isDiscovering && visibleFederations.length === 0"
        class="vipr-empty-state vipr-empty-state--inline discover-empty-state"
      >
        <div class="loading-container">
          <q-spinner color="primary" size="2em" />
          <div class="vipr-caption discover-loading-text">Searching...</div>
        </div>
      </div>

      <div class="discovery-footer">
        <div class="discovery-status vipr-caption">
          <q-spinner v-if="isDiscovering" color="primary" size="16px" class="discovery-spinner" />
          <span>{{ discoveryStatusText }}</span>
        </div>

        <div class="discovery-actions">
          <q-btn
            v-if="canLoadMore"
            flat
            dense
            no-caps
            label="Load more"
            icon="expand_more"
            class="vipr-btn vipr-btn--compact vipr-btn--secondary"
            @click="loadMoreFederations"
            data-testid="discover-federations-load-more-btn"
          />
          <q-btn
            flat
            dense
            no-caps
            :label="isDiscovering ? 'Stop' : 'Start'"
            class="vipr-btn vipr-btn--compact vipr-btn--primary-soft"
            @click="toggleDiscovery"
            data-testid="discover-federations-toggle-btn"
          />
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
import { useAppNotify } from 'src/composables/useAppNotify'
import type { DiscoverySelectionPayload } from 'src/types/federation'
import { getErrorMessage } from 'src/utils/error'
import { logger } from 'src/services/logger'

type DiscoveryListItem = {
  title: string
  federationId: string
  inviteCode: string
  recommendationCount: number
  about?: string
  pictureUrl?: string
}

const nostr = useNostrStore()
const federationStore = useFederationStore()
const notify = useAppNotify()
const isDiscovering = computed(() => nostr.isDiscoveringFederations)
const visibleFederations = computed<DiscoveryListItem[]>(() => {
  return nostr.discoveryCandidates.slice(0, nostr.previewTargetCount).map((candidate) => {
    const recommendationCount = Math.max(
      candidate.recommendationCount ?? 0,
      nostr.getRecommendationCountForFederationId(candidate.federationId),
    )

    return {
      title: candidate.displayName ?? `Federation ${truncateFederationId(candidate.federationId)}`,
      federationId: candidate.federationId,
      inviteCode: candidate.inviteCode,
      recommendationCount,
      ...(candidate.about != null ? { about: candidate.about } : {}),
      ...(candidate.pictureUrl != null ? { pictureUrl: candidate.pictureUrl } : {}),
    }
  })
})
const discoveryStatusText = computed(() => {
  const loaded = nostr.discoveryCandidates.length
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
function isAdded(federation: Pick<DiscoveryListItem, 'federationId'>): boolean {
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

function federationSummary(federation: DiscoveryListItem): string | null {
  if (federation.about != null && federation.about.trim() !== '') {
    return federation.about
  }

  return null
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
  emit('showAdd', { inviteCode: federation.inviteCode })
}

function truncateFederationId(federationId: string): string {
  if (federationId.length <= 12) {
    return federationId
  }
  return `${federationId.slice(0, 6)}...${federationId.slice(-4)}`
}
</script>

<style scoped>
.discover-sheet {
  display: flex;
  flex-direction: column;
  padding: var(--vipr-space-4);
}

.discover-list {
  overflow: hidden;
}

.discover-row {
  min-height: var(--vipr-row-min-height);
  padding: var(--vipr-row-padding-y) var(--vipr-row-padding-x);
  border-bottom: 1px solid var(--vipr-row-border) !important;
  transition: background-color 0.2s ease;
}

.discover-row:hover {
  background-color: var(--vipr-row-hover-bg);
  box-shadow: var(--vipr-row-hover-shadow);
}

.discover-row:last-child {
  border-bottom: none !important;
}

.discover-row,
.discover-sheet .q-btn {
  transition:
    transform 0.2s,
    background-color 0.2s;
}

.discover-row:active {
  transform: translateY(1px);
  background-color: var(--vipr-row-active-bg);
}

.logo {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--vipr-color-surface-border);
}

.logo--fallback {
  margin-right: var(--vipr-space-4);
}

.federation-title {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 0;
}

.federation-title__text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  color: var(--vipr-text-primary);
}

.federation-title__badge {
  margin-left: var(--vipr-space-2);
}

.federation-summary {
  color: var(--vipr-text-muted);
  margin-top: 2px;
  line-height: 1.35;
}

.federation-recommendation {
  color: var(--vipr-text-secondary);
  margin-top: 4px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
}

.discover-empty-state {
  padding: var(--vipr-space-6);
}

.discover-loading-text {
  margin-top: var(--vipr-space-1);
}

.discovery-footer {
  margin-top: var(--vipr-space-4);
  border-top: 1px solid var(--vipr-color-surface-border);
  padding-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.discovery-status {
  display: flex;
  align-items: center;
  min-height: 16px;
}

.discovery-spinner {
  margin-right: var(--vipr-space-2);
}

.discovery-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
