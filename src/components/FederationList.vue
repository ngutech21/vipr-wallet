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
      <q-item>
        <q-item-section avatar>
          <q-avatar size="44px" v-if="fedi?.metadata?.federation_icon_url">
            <q-img
              :src="fedi?.metadata?.federation_icon_url"
              loading="eager"
              no-spinner
              no-transition
            />
          </q-avatar>
          <template v-else>
            <q-avatar color="grey-3" text-color="grey-7" class="logo q-mr-md" size="44px">
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
            icon="chevron_right"
            :color="isSelected(fedi) ? 'primary' : 'grey-5'"
            size="sm"
            :to="{ name: '/federation/[id]', params: { id: String(fedi.federationId) } }"
            :data-testid="`federation-list-details-btn-${fedi.federationId}`"
          />
        </q-item-section>
      </q-item>
    </q-card>
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
</style>
