<template>
  <div class="federation-selector">
    <button
      type="button"
      class="federation-selector__trigger vipr-surface-card vipr-surface-card--strong"
      :class="{ 'federation-selector__trigger--readonly': !props.selectable }"
      :disabled="isTriggerDisabled"
      :data-testid="`${props.testIdPrefix}-selector-trigger`"
      @click="showSheet = true"
    >
      <FederationAvatar :federation="selectedFederation" />

      <span class="federation-selector__summary">
        <span class="federation-selector__title">
          {{ selectedFederation?.title ?? 'No federation selected' }}
        </span>
        <span
          class="federation-selector__balance"
          :data-testid="`${props.testIdPrefix}-active-balance`"
        >
          {{ activeBalanceLabel }}
        </span>
      </span>

      <q-spinner v-if="isSwitching" size="sm" color="primary" />
      <q-icon
        v-else-if="props.selectable"
        name="expand_more"
        class="federation-selector__chevron"
      />
    </button>

    <div
      v-if="selectionError"
      class="federation-selector__error"
      :data-testid="`${props.testIdPrefix}-selector-error`"
    >
      {{ selectionError }}
    </div>

    <q-dialog
      v-model="showSheet"
      position="bottom"
      transition-show="slide-up"
      transition-hide="slide-down"
    >
      <ModalCard title="Select federation" @close="showSheet = false">
        <div class="federation-selector-sheet">
          <button
            v-for="federation in federations"
            :key="federation.federationId"
            type="button"
            class="federation-selector-sheet__item vipr-surface-card vipr-surface-card--list"
            :class="{
              'federation-selector-sheet__item--active': isSelected(federation),
            }"
            :disabled="isSwitching"
            :data-testid="`${props.testIdPrefix}-option-${federation.federationId}`"
            @click="selectFederation(federation)"
          >
            <FederationAvatar :federation="federation" />

            <span class="federation-selector-sheet__copy">
              <span class="federation-selector-sheet__title">{{ federation.title }}</span>
              <span class="federation-selector-sheet__subtitle">
                {{ optionSubtitle(federation) }}
              </span>
            </span>

            <q-spinner
              v-if="switchingFederationId === federation.federationId"
              size="sm"
              color="primary"
            />
            <q-icon
              v-else-if="isSelected(federation)"
              name="check"
              class="federation-selector-sheet__status"
              :data-testid="`${props.testIdPrefix}-active-check`"
            />
            <q-icon v-else name="chevron_right" class="federation-selector-sheet__status" />
          </button>
        </div>
      </ModalCard>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'FederationSelector',
})

import { computed, ref } from 'vue'
import ModalCard from 'src/components/ModalCard.vue'
import { useFederationStore } from 'src/stores/federation'
import { useWalletStore } from 'src/stores/wallet'
import type { Federation } from 'src/types/federation'
import { getErrorMessage } from 'src/utils/error'
import { logger } from 'src/services/logger'
import FederationAvatar from './FederationAvatar.vue'

const props = withDefaults(
  defineProps<{
    selectable?: boolean
    testIdPrefix?: string
  }>(),
  {
    selectable: true,
    testIdPrefix: 'federation',
  },
)

const federationStore = useFederationStore()
const walletStore = useWalletStore()

const showSheet = ref(false)
const switchingFederationId = ref<string | null>(null)
const selectionError = ref('')

const federations = computed(() => federationStore.federations)
const selectedFederation = computed(() => federationStore.selectedFederation)
const isSwitching = computed(() => switchingFederationId.value != null)
const isTriggerDisabled = computed(
  () => federations.value.length === 0 || isSwitching.value || !props.selectable,
)
const formattedBalance = computed(() => Math.floor(walletStore.balance).toLocaleString())
const activeBalanceLabel = computed(() => {
  if (selectedFederation.value == null) {
    return 'Select a federation'
  }

  return `Available: ${formattedBalance.value} sats`
})

function isSelected(federation: Federation): boolean {
  return federation.federationId === selectedFederation.value?.federationId
}

function optionSubtitle(federation: Federation): string {
  if (isSelected(federation)) {
    return `Active · ${formattedBalance.value} sats available`
  }

  if (switchingFederationId.value === federation.federationId) {
    return 'Switching...'
  }

  return 'Select to view balance'
}

async function selectFederation(federation: Federation) {
  if (isSwitching.value) {
    return
  }

  selectionError.value = ''
  switchingFederationId.value = federation.federationId

  try {
    await federationStore.selectFederation(federation)
    showSheet.value = false
  } catch (error) {
    logger.error('Failed to switch federation', error)
    selectionError.value = `Failed to switch federation: ${getErrorMessage(error)}`
  } finally {
    switchingFederationId.value = null
  }
}
</script>

<style scoped>
.federation-selector {
  width: 100%;
}

.federation-selector__trigger {
  width: 100%;
  border: 1px solid var(--vipr-color-surface-border);
  border-radius: var(--vipr-radius-button-lg);
  padding: var(--vipr-space-3) var(--vipr-space-4);
  color: var(--vipr-text-primary);
  display: grid;
  grid-template-columns: var(--vipr-control-height-md) minmax(0, 1fr) var(--vipr-space-6);
  align-items: center;
  gap: var(--vipr-space-3);
  cursor: pointer;
  text-align: left;
}

.federation-selector__trigger:disabled {
  cursor: default;
  opacity: 0.72;
}

.federation-selector__trigger--readonly:disabled {
  opacity: 1;
}

.federation-selector__summary,
.federation-selector-sheet__copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--vipr-space-1);
}

.federation-selector__title,
.federation-selector-sheet__title {
  color: var(--vipr-text-primary);
  font-size: var(--vipr-font-size-section-title);
  font-weight: 700;
  line-height: var(--vipr-line-height-tight);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.federation-selector__balance,
.federation-selector-sheet__subtitle {
  color: var(--vipr-text-soft);
  font-size: var(--vipr-font-size-label);
  line-height: var(--vipr-line-height-body);
}

.federation-selector__chevron,
.federation-selector-sheet__status {
  color: var(--vipr-text-secondary);
  justify-self: end;
}

.federation-selector__error {
  margin-top: var(--vipr-space-2);
  color: var(--q-negative);
  font-size: var(--vipr-font-size-label);
  line-height: var(--vipr-line-height-body);
  text-align: center;
}

.federation-selector-sheet {
  display: flex;
  flex-direction: column;
  gap: var(--vipr-space-3);
  padding: var(--vipr-space-4);
}

.federation-selector-sheet__item {
  width: 100%;
  border: 1px solid var(--vipr-color-surface-border);
  border-radius: var(--vipr-radius-button-lg);
  padding: var(--vipr-space-4);
  display: grid;
  grid-template-columns: var(--vipr-control-height-md) minmax(0, 1fr) var(--vipr-space-6);
  align-items: center;
  gap: var(--vipr-space-3);
  color: var(--vipr-text-primary);
  text-align: left;
  cursor: pointer;
}

.federation-selector-sheet__item--active {
  border-color: var(--q-primary);
  background: var(--vipr-surface-card-bg-selected);
}

.federation-selector-sheet__item:disabled {
  cursor: progress;
  opacity: 0.72;
}
</style>
