<template>
  <div class="vipr-flow-step preview-step" data-testid="join-federation-preview-step">
    <q-card flat class="preview-card vipr-surface-card vipr-surface-card--strong">
      <q-card-section class="preview-header">
        <q-avatar v-if="federation.metadata?.federation_icon_url" size="64px" class="preview-icon">
          <q-img :src="federation.metadata.federation_icon_url" loading="eager" no-spinner />
        </q-avatar>
        <q-avatar v-else size="64px" color="grey-3" text-color="grey-8" class="preview-icon">
          <q-icon name="account_balance" />
        </q-avatar>

        <div class="preview-header__body">
          <div class="preview-title">{{ federation.title }}</div>
          <div class="preview-copy">
            Review this federation before you join. Your ecash will be held by a federation you
            trust.
          </div>

          <div class="preview-chip-row">
            <q-chip v-if="defaultCurrency" color="primary" text-color="white" size="sm">
              {{ defaultCurrency }}
            </q-chip>
            <q-chip v-if="networkLabel" color="grey-8" text-color="white" size="sm">
              {{ networkLabel }}
            </q-chip>
            <q-chip color="grey-8" text-color="white" size="sm">
              {{ guardianCount }} Guardians
            </q-chip>
            <q-chip v-if="moduleCount > 0" color="grey-8" text-color="white" size="sm">
              {{ moduleCount }} Modules
            </q-chip>
          </div>

          <div v-if="previewMessage" class="preview-note preview-note--prominent">
            {{ previewMessage }}
          </div>

          <div v-if="welcomeMessage" class="preview-note">
            {{ welcomeMessage }}
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card
      v-if="importAmountSats != null"
      flat
      class="preview-card vipr-surface-card vipr-surface-card--strong"
    >
      <q-card-section>
        <div class="preview-section-title">Import amount</div>
        <div class="preview-amount">{{ formatNumber(importAmountSats) }} sats</div>
      </q-card-section>
    </q-card>

    <q-card
      v-if="moduleKinds.length > 0"
      flat
      class="preview-card vipr-surface-card vipr-surface-card--strong"
    >
      <q-card-section>
        <div class="preview-section-title">Supported modules</div>
        <div class="preview-chip-row preview-chip-row--compact">
          <q-chip
            v-for="moduleKind in moduleKinds"
            :key="moduleKind"
            color="positive"
            text-color="black"
            size="sm"
          >
            {{ moduleKind }}
          </q-chip>
        </div>
      </q-card-section>
    </q-card>

    <q-expansion-item
      class="detail-accordion vipr-surface-card vipr-surface-card--subtle"
      expand-separator
      icon="groups"
      label="Guardians"
      header-class="text-white"
      data-testid="guardian-details-accordion"
    >
      <div class="detail-accordion__body">
        <FederationGuardians :guardians="federation.guardians ?? []" :show-header="false" />
      </div>
    </q-expansion-item>

    <q-expansion-item
      class="detail-accordion vipr-surface-card vipr-surface-card--subtle"
      expand-separator
      icon="info"
      label="Federation details"
      header-class="text-white"
    >
      <div class="technical-details__body">
        <div class="preview-label">Federation ID</div>
        <div class="preview-id">{{ federation.federationId }}</div>

        <template v-if="federation.inviteCode !== ''">
          <div class="preview-label preview-label--spaced">Invite code</div>
          <div class="preview-id">{{ federation.inviteCode }}</div>
        </template>
      </div>
    </q-expansion-item>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFormatters } from 'src/utils/formatter'
import FederationGuardians from 'src/components/FederationGuardians.vue'
import type { Federation } from 'src/types/federation'

const props = defineProps<{
  federation: Federation
  importAmountSats?: number | null
}>()

const { formatNumber } = useFormatters()

const guardianCount = computed(() => props.federation.guardians?.length ?? 0)
const moduleCount = computed(() => props.federation.modules.length)
const moduleKinds = computed(() => props.federation.modules.map((module) => module.kind))
const defaultCurrency = computed(() => props.federation.metadata?.default_currency ?? null)
const networkLabel = computed(() => props.federation.network ?? null)
const previewMessage = computed(() => props.federation.metadata?.preview_message ?? null)
const welcomeMessage = computed(() => props.federation.metadata?.welcome_message ?? null)
</script>

<style scoped>
.preview-step {
  gap: var(--vipr-space-3);
}

.preview-card {
  overflow: hidden;
}

.preview-header {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
}

.preview-icon {
  margin-right: var(--vipr-space-4);
  flex: 0 0 auto;
}

.preview-header__body {
  min-width: 0;
  flex: 1 1 auto;
}

.preview-title {
  font-size: 1.25rem;
  font-weight: 600;
  line-height: var(--vipr-line-height-tight);
}

.preview-copy {
  margin-top: var(--vipr-space-2);
  color: var(--vipr-text-soft);
  font-size: var(--vipr-font-size-body);
  line-height: var(--vipr-line-height-body);
}

.preview-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--vipr-space-2);
  margin-top: var(--vipr-space-4);
}

.preview-chip-row--compact {
  margin-top: var(--vipr-space-2);
}

.preview-section-title {
  font-weight: 500;
  font-size: 1rem;
  line-height: var(--vipr-line-height-tight);
}

.preview-amount {
  margin-top: var(--vipr-space-2);
  font-size: 1.5rem;
  font-weight: 600;
  line-height: var(--vipr-line-height-tight);
}

.preview-label {
  color: var(--vipr-text-soft);
  font-size: var(--vipr-font-size-caption);
}

.preview-label--spaced {
  margin-top: var(--vipr-space-4);
}

.preview-id {
  margin-top: var(--vipr-space-1);
  word-break: break-all;
  font-family: monospace;
  font-size: 0.875rem;
}

.preview-note {
  margin-top: var(--vipr-space-2);
  padding: var(--vipr-space-3) 14px;
  border-radius: var(--vipr-radius-sm);
  background: var(--vipr-surface-card-bg-hover);
  color: var(--vipr-text-secondary);
}

.preview-note--prominent {
  margin-top: var(--vipr-space-4);
}

.detail-accordion {
  overflow: hidden;
}

.detail-accordion__body {
  padding: var(--vipr-space-4);
  background: rgba(0, 0, 0, 0.1);
}

.technical-details__body {
  padding: var(--vipr-space-4);
}
</style>
