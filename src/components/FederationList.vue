<template>
  <div v-if="federations.length > 0" class="federation-list">
    <q-card
      v-for="fedi in federations"
      :key="fedi.federationId"
      :class="['federation-card', isSelected(fedi) ? 'federation-selected' : '']"
      flat
      @click="selectFederation(fedi)"
      :data-testid="`federation-list-item-${fedi.federationId}`"
    >
      <q-item class="federation-item">
        <q-item-section avatar class="federation-avatar-section">
          <q-avatar size="44px" v-if="fedi?.metadata?.federation_icon_url">
            <q-img
              :src="fedi?.metadata?.federation_icon_url"
              loading="eager"
              no-spinner
              no-transition
            />
          </q-avatar>
          <template v-else>
            <q-avatar color="grey-3" text-color="grey-7" class="logo" size="44px">
              <q-icon name="account_balance" />
            </q-avatar>
          </template>
        </q-item-section>

        <q-item-section>
          <q-item-label class="federation-title-row">
            <span class="federation-title">{{ fedi.title }}</span>
            <q-chip
              size="sm"
              :color="isSelected(fedi) ? 'primary' : 'grey-8'"
              text-color="white"
              dense
              class="status-chip"
              :data-testid="`federation-list-status-${fedi.federationId}`"
            >
              {{ isSelected(fedi) ? 'Active' : 'Available' }}
            </q-chip>
          </q-item-label>
          <q-item-label caption class="federation-summary">
            {{ federationSummary(fedi) }}
          </q-item-label>
        </q-item-section>

        <q-item-section side>
          <q-btn
            flat
            round
            dense
            icon="chevron_right"
            color="grey-6"
            size="md"
            class="federation-details-button"
            :to="{ name: '/federation/[id]', params: { id: String(fedi.federationId) } }"
            :data-testid="`federation-list-details-btn-${fedi.federationId}`"
          />
        </q-item-section>
      </q-item>
    </q-card>
  </div>
  <div v-else class="federation-empty-state" data-testid="federation-empty-state">
    <div class="federation-empty-state__title">No federations yet</div>
    <div class="federation-empty-state__copy">Federation details will appear here after setup.</div>
  </div>
</template>

<script setup lang="ts">
import { useFederationStore } from 'src/stores/federation'
import type { Federation } from 'src/types/federation'
import { storeToRefs } from 'pinia'
import { logger } from 'src/services/logger'

const store = useFederationStore()
const { federations, selectedFederation } = storeToRefs(store)

async function selectFederation(fedi: Federation) {
  try {
    await store.selectFederation(fedi)
  } catch (error) {
    logger.error('Failed to select federation', error)
  }
}

function isSelected(fedi: Federation): boolean {
  return fedi.federationId === selectedFederation.value?.federationId
}

function federationSummary(fedi: Federation): string {
  const summaryParts = [
    fedi.guardians != null && fedi.guardians.length > 0
      ? formatCountLabel(fedi.guardians.length, 'guardian')
      : null,
    fedi.modules.length > 0 ? formatCountLabel(fedi.modules.length, 'module') : null,
  ].filter((part): part is string => part != null)

  if (summaryParts.length > 0) {
    return summaryParts.join(' • ')
  }

  return 'Ready to use'
}

function formatCountLabel(count: number, noun: string): string {
  return count === 1 ? `1 ${noun}` : `${count} ${noun}s`
}
</script>

<style lang="scss" scoped>
.federation-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.federation-card {
  transition: all 0.2s ease;
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  &.federation-selected {
    background: rgba(var(--q-primary-rgb), 0.08);
    border-color: var(--q-primary);
  }
}

.federation-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.federation-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.federation-summary {
  margin-top: 6px;
  color: rgba(255, 255, 255, 0.56);
  font-size: 0.9rem;
}

.status-chip {
  height: 22px;
  font-size: 0.7rem;
  letter-spacing: 0.01em;
  flex-shrink: 0;
}

.federation-details-button {
  color: rgba(255, 255, 255, 0.54) !important;
}

.federation-empty-state {
  min-height: calc(100dvh - 220px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 24px 120px;
  text-align: center;
}

.federation-empty-state__title {
  color: white;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.2;
}

.federation-empty-state__copy {
  max-width: 320px;
  margin-top: 6px;
  color: rgba(255, 255, 255, 0.86);
  font-size: 1rem;
  line-height: 1.35;
}
</style>
