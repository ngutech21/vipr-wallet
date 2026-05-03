<template>
  <section v-if="factItems.length > 0 || hasLinkItems" class="federation-open-section">
    <div class="federation-open-section__title">Limits & terms</div>
    <div class="vipr-detail-list federation-receipt-list">
      <div v-for="fact in factItems" :key="fact.label" class="vipr-detail-row">
        <div class="vipr-detail-label">{{ fact.label }}</div>
        <div class="vipr-detail-value federation-receipt-list__value">{{ fact.value }}</div>
      </div>

      <div v-if="metadata?.tosUrl" class="vipr-detail-row">
        <div class="vipr-detail-label">Terms</div>
        <a
          class="vipr-detail-value federation-metadata-url federation-metadata-link"
          :href="metadata.tosUrl"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="federation-details-tos-link"
        >
          {{ metadata.tosUrl }}
        </a>
      </div>

      <div v-if="metadata?.recurringdApi" class="vipr-detail-row vipr-detail-row--block">
        <div class="vipr-detail-label">Recurringd API</div>
        <div class="vipr-detail-value vipr-detail-value--mono federation-metadata-url">
          {{ metadata.recurringdApi }}
        </div>
      </div>

      <div v-if="metadata?.lnaddressApi" class="vipr-detail-row vipr-detail-row--block">
        <div class="vipr-detail-label">Lightning Address API</div>
        <div class="vipr-detail-value vipr-detail-value--mono federation-metadata-url">
          {{ metadata.lnaddressApi }}
        </div>
      </div>

      <div v-if="metadata?.federationSuccessor" class="vipr-detail-row vipr-detail-row--block">
        <div class="vipr-detail-label">Successor Federation</div>
        <div class="vipr-detail-value vipr-detail-value--mono federation-metadata-url">
          {{ metadata.federationSuccessor }}
        </div>
      </div>
    </div>
  </section>
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

const factItems = computed(() => {
  const metadata = props.metadata
  if (metadata == null) {
    return []
  }

  return [
    metadata.isPublic != null
      ? {
          label: 'Visibility',
          value: metadata.isPublic ? 'Public' : 'Private',
        }
      : null,
    metadata.defaultCurrency != null
      ? {
          label: 'Currency',
          value: metadata.defaultCurrency,
        }
      : null,
    metadata.maxInvoiceMsats != null
      ? {
          label: 'Max invoice',
          value: `${formatMsatsAsSats(metadata.maxInvoiceMsats)} sats`,
        }
      : null,
    metadata.maxBalanceMsats != null
      ? {
          label: 'Max balance',
          value: `${formatMsatsAsSats(metadata.maxBalanceMsats)} sats`,
        }
      : null,
    metadata.federationExpiryTimestamp != null
      ? {
          label: 'Expires',
          value: formatTimestamp(metadata.federationExpiryTimestamp),
        }
      : null,
  ].filter((item): item is { label: string; value: string; caption?: string } => item != null)
})

const hasLinkItems = computed(() => {
  return (
    props.metadata?.tosUrl != null ||
    props.metadata?.recurringdApi != null ||
    props.metadata?.lnaddressApi != null ||
    props.metadata?.federationSuccessor != null
  )
})

function formatMsatsAsSats(value: number): string {
  return formatNumber(value / 1000)
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString()
}
</script>

<style scoped>
.federation-facts-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--vipr-space-2);
  margin-bottom: var(--vipr-federation-detail-card-gap);
}

.federation-open-section {
  display: grid;
  gap: var(--vipr-space-2);
}

.federation-open-section__title {
  color: var(--vipr-text-primary);
  font-size: var(--vipr-font-size-body);
  font-weight: 700;
  line-height: var(--vipr-line-height-tight);
}

.federation-receipt-list__value {
  text-align: right;
}

.federation-fact-card {
  min-width: 0;
}

.federation-fact-card__section {
  padding: var(--vipr-space-3);
}

.federation-fact-card__label {
  color: var(--vipr-text-muted);
  font-size: var(--vipr-font-size-label);
  font-weight: 600;
  letter-spacing: 0;
  line-height: var(--vipr-line-height-tight);
}

.federation-fact-card__value {
  margin-top: var(--vipr-space-2);
  color: var(--vipr-text-primary);
  font-size: var(--vipr-font-size-body);
  font-weight: 700;
  line-height: var(--vipr-line-height-tight);
  word-break: break-word;
}

.federation-fact-card__caption,
.federation-metadata-url {
  margin-top: var(--vipr-space-2);
}

.federation-metadata-link {
  display: inline-block;
  color: var(--vipr-text-secondary);
  text-decoration: none;
}

.federation-metadata-link:hover {
  color: var(--vipr-text-primary);
}

@media (max-width: 420px) {
  .federation-facts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
