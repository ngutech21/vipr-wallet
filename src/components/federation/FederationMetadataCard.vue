<template>
  <template v-if="hasMetadata">
    <div class="vipr-section-title federation-section-title">Details</div>
    <q-card flat class="federation-card vipr-surface-card vipr-surface-card--subtle">
      <q-card-section>
        <div class="vipr-detail-list">
          <div v-if="metadata?.maxBalanceMsats" class="vipr-detail-row">
            <div class="vipr-detail-label">Maximum Balance</div>
            <div class="vipr-detail-value">
              <span> {{ formatMsatsAsSats(metadata.maxBalanceMsats) }} sats </span>
            </div>
          </div>

          <div v-if="metadata?.maxInvoiceMsats" class="vipr-detail-row">
            <div class="vipr-detail-label">Maximum Invoice</div>
            <div class="vipr-detail-value">
              <span> {{ formatMsatsAsSats(metadata.maxInvoiceMsats) }} sats </span>
            </div>
          </div>

          <div v-if="metadata?.isPublic != null" class="vipr-detail-row">
            <div class="vipr-detail-label">Public Federation</div>
            <div class="vipr-detail-value">
              <span>
                <q-chip
                  size="sm"
                  :class="[
                    'vipr-chip',
                    metadata.isPublic ? 'vipr-chip--positive' : 'vipr-chip--muted',
                  ]"
                >
                  <q-icon :name="metadata.isPublic ? 'public' : 'public_off'" left size="xs" />
                  {{ metadata.isPublic ? 'Public' : 'Private' }}
                </q-chip>
              </span>
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </template>

  <q-card
    v-if="metadata?.tosUrl"
    flat
    class="federation-card vipr-surface-card vipr-surface-card--subtle"
  >
    <q-card-section>
      <q-list>
        <q-item
          clickable
          tag="a"
          :href="metadata.tosUrl"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="federation-details-tos-link"
        >
          <q-item-section avatar>
            <q-icon name="description" color="primary" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Terms of Service</q-item-label>
            <q-item-label class="vipr-caption">
              View the federation's terms and conditions
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-icon name="open_in_new" color="primary" />
          </q-item-section>
        </q-item>
      </q-list>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FederationMeta } from 'src/types/federation'
import { useFormatters } from 'src/utils/formatter'

defineOptions({
  name: 'FederationMetadataCard',
})

const props = defineProps<{
  metadata?: FederationMeta | undefined
}>()

const { formatNumber } = useFormatters()

const hasMetadata = computed(() => {
  return props.metadata != null && Object.keys(props.metadata).length > 0
})

function formatMsatsAsSats(value: number): string {
  return formatNumber(value / 1000)
}
</script>
