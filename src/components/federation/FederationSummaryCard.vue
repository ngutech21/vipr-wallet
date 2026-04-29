<template>
  <q-card
    flat
    class="federation-card federation-card--summary vipr-surface-card vipr-surface-card--summary"
  >
    <q-card-section class="summary-layout">
      <div class="summary-logo">
        <q-avatar v-if="federation?.metadata?.federation_icon_url" size="78px">
          <q-img
            :src="federation.metadata.federation_icon_url"
            loading="eager"
            no-spinner
            no-transition
          />
        </q-avatar>
        <template v-else>
          <q-avatar color="grey-3" text-color="grey-7" class="logo">
            <q-icon name="account_balance" />
          </q-avatar>
        </template>
      </div>

      <div class="summary-body">
        <div class="summary-title-row">
          <div class="summary-title ellipsis">{{ federation?.title }}</div>
          <q-btn
            v-if="observerUrl"
            flat
            round
            dense
            size="sm"
            icon="open_in_new"
            type="a"
            :href="observerUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="summary-link"
            data-testid="federation-details-observer-link"
          >
            <q-tooltip>Open in Fedimint Observer</q-tooltip>
          </q-btn>
        </div>

        <div class="summary-currency vipr-caption">
          {{ federation?.metadata?.default_currency }}
        </div>

        <div class="summary-modules">
          <q-chip
            v-for="module in federation?.modules"
            :key="module.kind"
            size="sm"
            class="vipr-chip vipr-chip--positive summary-module-chip"
          >
            {{ module.kind }}
          </q-chip>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import type { Federation } from 'src/types/federation'

defineOptions({
  name: 'FederationSummaryCard',
})

defineProps<{
  federation?: Federation | undefined
  observerUrl: string
}>()
</script>

<style scoped>
.summary-layout {
  display: flex;
  align-items: center;
  gap: var(--vipr-federation-detail-summary-gap);
}

.summary-logo {
  flex: 0 0 auto;
}

.summary-body {
  min-width: 0;
  flex: 1 1 auto;
}

.summary-title-row {
  display: flex;
  align-items: center;
  gap: var(--vipr-federation-detail-title-row-gap);
}

.summary-title {
  color: var(--vipr-text-primary);
  font-size: var(--vipr-font-size-summary-title);
  font-weight: 700;
  line-height: var(--vipr-line-height-tight);
  letter-spacing: 0;
}

.summary-link {
  color: var(--vipr-text-secondary);
}

.summary-currency {
  margin-top: var(--vipr-federation-detail-currency-gap);
}

.summary-modules {
  display: flex;
  flex-wrap: wrap;
  gap: var(--vipr-federation-detail-modules-gap);
  margin-top: var(--vipr-federation-detail-modules-top-space);
}

.summary-module-chip {
  margin: 0;
}

@media (max-width: 599px) {
  .summary-layout {
    align-items: flex-start;
  }

  .summary-title {
    font-size: var(--vipr-federation-detail-title-font-size-mobile);
  }
}
</style>
