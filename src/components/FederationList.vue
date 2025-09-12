<template>
  <div v-if="federations.length > 0">
    <transition-group name="federation-list" tag="div" class="federation-list">
      <q-card
        v-for="fedi in federations"
        :key="fedi.federationId"
        :class="['federation-card q-mb-md', isSelected(fedi) ? 'federation-selected' : '']"
        flat
        bordered
        @click="selectFederation(fedi)"
      >
        <div v-if="isSelected(fedi)" class="selection-indicator"></div>

        <q-item>
          <q-item-section avatar>
            <q-avatar size="42px" v-if="fedi?.metadata?.federation_icon_url">
              <q-img
                :src="fedi?.metadata?.federation_icon_url"
                loading="eager"
                no-spinner
                no-transition
              />
            </q-avatar>
            <template v-else>
              <q-avatar color="grey-3" text-color="grey-7" class="logo q-mr-md">
                <q-icon name="account_balance" />
              </q-avatar>
            </template>
          </q-item-section>

          <!-- Federation details -->
          <q-item-section>
            <q-item-label class="text-weight-medium">{{ fedi.title }}</q-item-label>
            <q-item-label caption>
              <q-chip
                size="sm"
                :color="isSelected(fedi) ? 'primary' : 'grey-7'"
                text-color="white"
                dense
                class="status-chip"
              >
                {{ isSelected(fedi) ? 'Active' : 'Available' }}
              </q-chip>
              <span class="federation-id q-ml-sm">ID: {{ truncateId(fedi.federationId) }}</span>
            </q-item-label>
          </q-item-section>

          <!-- Action buttons -->
          <q-item-section side>
            <div class="row items-center">
              <q-btn
                flat
                round
                icon="arrow_forward"
                :color="isSelected(fedi) ? 'primary' : 'grey'"
                size="sm"
                class="q-mr-sm"
                :to="`/federation/${encodeURIComponent(String(fedi.federationId))}`"
              />
            </div>
          </q-item-section>
        </q-item>
      </q-card>
    </transition-group>

    <!-- Empty state when no federations -->
    <div v-if="federations.length === 0" class="column items-center q-pa-lg text-grey">
      <q-icon name="info" size="48px" />
      <div class="text-subtitle1 q-mt-md">No federations added yet</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFederationStore } from 'src/stores/federation'
import type { Federation } from './models'
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

function truncateId(id: string): string {
  if (id.length <= 12) return id
  return `${id.substring(0, 6)  }...${  id.substring(id.length - 6)}`
}
</script>

<style lang="scss" scoped>
.federation-list {
  display: flex;
  flex-direction: column;
}

.federation-card {
  position: relative;
  transition: all 0.2s ease;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.1);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  }

  &.federation-selected {
    background: rgba(var(--q-primary-rgb), 0.1);
    border-color: var(--q-primary);
  }
}

.selection-indicator {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--q-primary);
  border-radius: 4px 0 0 4px;
}

.status-chip {
  height: 18px;
  font-size: 10px;
}

.federation-id {
  opacity: 0.6;
  font-size: 11px;
}

// List animations
.federation-list-enter-active,
.federation-list-leave-active {
  transition: all 0.3s;
}

.federation-list-enter-from,
.federation-list-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.federation-list-move {
  transition: transform 0.3s;
}
</style>
