<template>
  <div class="vipr-flow-step preview-step" data-testid="join-federation-preview-step">
    <q-card flat class="preview-card vipr-surface-card vipr-surface-card--strong">
      <q-card-section class="row items-center no-wrap">
        <q-avatar v-if="federation.metadata?.federation_icon_url" size="64px" class="q-mr-md">
          <q-img :src="federation.metadata.federation_icon_url" loading="eager" no-spinner />
        </q-avatar>
        <q-avatar v-else size="64px" color="grey-3" text-color="grey-8" class="q-mr-md">
          <q-icon name="account_balance" />
        </q-avatar>

        <div class="col">
          <div class="text-h6">{{ federation.title }}</div>
          <div class="text-body2 text-grey-5 q-mt-sm">
            Review this federation before you join. Your ecash will be held by a federation you
            trust.
          </div>

          <div class="row q-gutter-sm q-mt-md">
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

          <div v-if="previewMessage" class="preview-note q-mt-md">
            {{ previewMessage }}
          </div>

          <div v-if="welcomeMessage" class="preview-note q-mt-sm">
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
        <div class="text-subtitle1 text-weight-medium">Import amount</div>
        <div class="text-h5 q-mt-sm">{{ formatNumber(importAmountSats) }} sats</div>
      </q-card-section>
    </q-card>

    <q-card
      v-if="moduleKinds.length > 0"
      flat
      class="preview-card vipr-surface-card vipr-surface-card--strong"
    >
      <q-card-section>
        <div class="text-subtitle1 text-weight-medium">Supported modules</div>
        <div class="row q-gutter-sm q-mt-sm">
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
      <div class="detail-accordion__body q-pa-md">
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
      <div class="technical-details__body q-pa-md">
        <div class="text-caption text-grey-5">Federation ID</div>
        <div class="preview-id q-mt-xs">{{ federation.federationId }}</div>

        <template v-if="federation.inviteCode !== ''">
          <div class="text-caption text-grey-5 q-mt-md">Invite code</div>
          <div class="preview-id q-mt-xs">{{ federation.inviteCode }}</div>
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

.preview-id {
  word-break: break-all;
  font-family: monospace;
  font-size: 0.875rem;
}

.preview-note {
  padding: var(--vipr-space-3) 14px;
  border-radius: var(--vipr-radius-sm);
  background: var(--vipr-surface-card-bg-hover);
  color: var(--vipr-text-secondary);
}

.detail-accordion {
  overflow: hidden;
}

.detail-accordion__body {
  background: rgba(0, 0, 0, 0.1);
}
</style>
