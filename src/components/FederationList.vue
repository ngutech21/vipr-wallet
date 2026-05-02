<template>
  <div v-if="federations.length > 0" class="federation-list">
    <q-card
      v-for="fedi in federations"
      :key="fedi.federationId"
      :class="[
        'federation-card vipr-surface-card vipr-surface-card--list',
        isSelected(fedi) ? 'federation-selected vipr-surface-card--selected' : '',
      ]"
      flat
      @click="selectFederation(fedi)"
      :data-testid="`federation-list-item-${fedi.federationId}`"
    >
      <q-item class="federation-item">
        <q-item-section avatar class="federation-avatar-section">
          <q-avatar v-if="fedi?.metadata?.iconUrl" size="44px">
            <q-img :src="fedi.metadata.iconUrl" loading="eager" no-spinner no-transition />
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
  <div v-else class="vipr-empty-state vipr-empty-state--page" data-testid="federation-empty-state">
    <div class="vipr-empty-state__title">No federations yet</div>
    <div class="vipr-empty-state__body">Federation details will appear here after setup.</div>
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
