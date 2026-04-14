<template>
  <div class="q-pa-md" data-testid="join-federation-preview-step">
    <q-card flat class="preview-card q-mb-md">
      <q-card-section class="row items-center no-wrap">
        <q-avatar v-if="federation.metadata?.federation_icon_url" size="64px" class="q-mr-md">
          <q-img :src="federation.metadata.federation_icon_url" loading="eager" no-spinner />
        </q-avatar>
        <q-avatar v-else size="64px" color="grey-3" text-color="grey-8" class="q-mr-md">
          <q-icon name="account_balance" />
        </q-avatar>

        <div class="col">
          <div class="text-h6">{{ federation.title }}</div>
          <div class="text-caption text-grey-5 preview-id">
            {{ federation.federationId }}
          </div>
          <div
            v-if="federation.metadata?.default_currency"
            class="text-caption text-grey-6 q-mt-xs"
          >
            {{ federation.metadata.default_currency }}
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-card v-if="federation.modules.length > 0" flat class="preview-card q-mb-md">
      <q-card-section>
        <div class="text-subtitle1 q-mb-sm">Modules</div>
        <div class="row q-gutter-sm">
          <q-chip
            v-for="module in federation.modules"
            :key="module.kind"
            color="positive"
            text-color="black"
            size="sm"
          >
            {{ module.kind }}
          </q-chip>
        </div>
      </q-card-section>
    </q-card>

    <q-card v-if="importAmountSats != null" flat class="preview-card q-mb-md">
      <q-card-section>
        <div class="text-subtitle1">Import Amount</div>
        <div class="text-h5 q-mt-sm">{{ formatNumber(importAmountSats) }} sats</div>
      </q-card-section>
    </q-card>

    <FederationGuardians :guardians="federation.guardians ?? []" class="q-mb-lg" />

    <div class="row q-col-gutter-sm">
      <div class="col">
        <q-btn
          flat
          label="Back"
          color="primary"
          class="full-width"
          :disable="isSubmitting"
          @click="emit('back')"
        />
      </div>
      <div class="col">
        <q-btn
          label="Join Federation"
          color="primary"
          class="full-width"
          data-testid="add-federation-submit-btn"
          :disable="isSubmitting"
          :loading="isSubmitting"
          :data-busy="isSubmitting ? 'true' : 'false'"
          @click="emit('join')"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useFormatters } from 'src/utils/formatter'
import FederationGuardians from 'src/components/FederationGuardians.vue'
import type { Federation } from 'src/components/models'

defineProps<{
  federation: Federation
  isSubmitting: boolean
  importAmountSats?: number | null
}>()

const { formatNumber } = useFormatters()

const emit = defineEmits<{
  back: []
  join: []
}>()
</script>

<style scoped>
.preview-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.preview-id {
  word-break: break-all;
}
</style>
