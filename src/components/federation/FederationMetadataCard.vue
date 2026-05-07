<template>
  <section v-if="factItems.length > 0 || hasLinkItems" class="federation-open-section">
    <div class="federation-open-section__title">Limits & terms</div>
    <div
      v-if="factItems.length > 0 || metadata?.tosUrl"
      class="vipr-detail-list federation-receipt-list"
    >
      <div v-for="fact in factItems" :key="fact.label" class="vipr-detail-row">
        <div class="vipr-detail-label">{{ fact.label }}</div>
        <div class="vipr-detail-value federation-receipt-list__value">{{ fact.value }}</div>
      </div>

      <a
        v-if="metadata?.tosUrl"
        class="vipr-detail-row federation-terms-row"
        :href="metadata.tosUrl"
        target="_blank"
        rel="noopener noreferrer"
        data-testid="federation-details-tos-link"
        :aria-label="`Open terms of service: ${metadata.tosUrl}`"
      >
        <span class="vipr-detail-label">Terms</span>
        <span class="federation-terms-row__value">
          <span class="federation-terms-row__text">View document</span>
          <q-icon name="open_in_new" class="federation-terms-row__icon" />
        </span>
      </a>
    </div>

    <div v-if="technicalItems.length > 0" class="vipr-detail-list federation-receipt-list">
      <div
        v-for="item in technicalItems"
        :key="item.label"
        class="vipr-detail-row vipr-detail-row--block"
      >
        <div class="vipr-detail-label">{{ item.label }}</div>
        <div class="vipr-detail-value vipr-detail-value--mono federation-metadata-url">
          {{ item.value }}
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

const technicalItems = computed(() => {
  const metadata = props.metadata
  if (metadata == null) {
    return []
  }

  return [
    metadata.recurringdApi != null
      ? {
          label: 'Recurringd API',
          value: metadata.recurringdApi,
        }
      : null,
    metadata.lnaddressApi != null
      ? {
          label: 'Lightning Address API',
          value: metadata.lnaddressApi,
        }
      : null,
    metadata.federationSuccessor != null
      ? {
          label: 'Successor Federation',
          value: metadata.federationSuccessor,
        }
      : null,
  ].filter((item): item is { label: string; value: string } => item != null)
})

const hasLinkItems = computed(() => {
  return props.metadata?.tosUrl != null || technicalItems.value.length > 0
})

function formatMsatsAsSats(value: number): string {
  return formatNumber(value / 1000)
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString()
}
</script>

<style scoped>
.federation-open-section {
  display: grid;
  gap: var(--vipr-space-3);
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

.federation-metadata-url {
  margin-top: var(--vipr-space-2);
}

.federation-terms-row {
  min-width: 0;
  color: inherit;
  text-decoration: none;
  transition:
    background-color 160ms ease-out,
    color 160ms ease-out;
}

.federation-terms-row:hover,
.federation-terms-row:focus-visible {
  background: var(--vipr-surface-card-bg-hover);
}

.federation-terms-row:focus-visible {
  outline: 2px solid var(--q-primary);
  outline-offset: 2px;
}

.federation-terms-row__value {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--vipr-space-2);
  color: var(--vipr-text-secondary);
  font-weight: 600;
  text-align: right;
}

.federation-terms-row__text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.federation-terms-row__icon {
  flex: 0 0 auto;
  color: var(--vipr-text-muted);
  font-size: 1.1rem;
}

.federation-terms-row:hover .federation-terms-row__value,
.federation-terms-row:focus-visible .federation-terms-row__value {
  color: var(--vipr-text-primary);
}
</style>
