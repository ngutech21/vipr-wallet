<template>
  <section class="federation-profile">
    <div class="summary-layout">
      <q-avatar v-if="federation?.metadata?.iconUrl" class="summary-logo">
        <q-img :src="federation.metadata.iconUrl" loading="eager" no-spinner no-transition />
      </q-avatar>
      <q-avatar v-else class="summary-logo summary-logo--fallback">
        <q-icon name="account_balance" />
      </q-avatar>

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

        <div class="summary-meta-line">
          <span v-if="federation?.guardians?.length != null">
            {{ federation.guardians.length }} guardians
          </span>
          <span v-if="gatewayCountLabel">
            {{ gatewayCountLabel }}
          </span>
        </div>

        <div
          v-if="federation?.modules.length"
          class="summary-modules"
          aria-label="Supported modules"
        >
          <q-chip
            v-for="module in federation?.modules"
            :key="module.kind"
            size="sm"
            class="vipr-chip summary-module-chip"
          >
            {{ module.kind }}
          </q-chip>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Federation } from 'src/types/federation'

defineOptions({
  name: 'FederationSummaryCard',
})

defineProps<{
  federation?: Federation | undefined
  observerUrl: string
  gatewayCountLabel?: string
}>()
</script>

<style scoped>
.federation-profile {
  min-width: 0;
  padding: var(--vipr-space-3) 0 var(--vipr-space-4);
}

.summary-layout {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--vipr-federation-detail-summary-gap);
}

.summary-logo {
  flex: 0 0 auto;
  width: 64px;
  height: 64px;
  background: rgba(54, 164, 255, 0.08);
}

.summary-logo--fallback {
  color: var(--vipr-text-secondary);
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
  font-size: 1.22rem;
  font-weight: 700;
  line-height: var(--vipr-line-height-tight);
  letter-spacing: 0;
}

.summary-link {
  color: var(--vipr-text-secondary);
}

.summary-meta-line {
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  gap: var(--vipr-space-2);
  margin-top: var(--vipr-federation-detail-currency-gap);
  color: var(--vipr-text-secondary);
  font-size: var(--vipr-font-size-caption);
  font-weight: 500;
  line-height: var(--vipr-line-height-tight);
}

.summary-meta-line span + span::before {
  content: '·';
  margin-right: var(--vipr-space-2);
  color: var(--vipr-text-faint);
}

.summary-modules {
  min-width: 0;
  display: flex;
  flex-wrap: nowrap;
  gap: var(--vipr-space-2);
  margin-top: var(--vipr-space-3);
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
}

.summary-modules::-webkit-scrollbar {
  display: none;
}

.summary-module-chip {
  flex: 0 0 auto;
  margin: 0;
  min-width: 44px;
  height: 28px;
  background: var(--vipr-chip-bg-muted);
  color: var(--vipr-text-secondary);
  font-size: var(--vipr-font-size-label);
  font-weight: 600;
  line-height: var(--vipr-line-height-tight);
}

.summary-module-chip :deep(.q-chip__content) {
  padding: 0 var(--vipr-space-2);
  max-width: 16ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 599px) {
  .summary-layout {
    align-items: flex-start;
  }

  .summary-title {
    font-size: 1.15rem;
  }

  .summary-logo {
    width: 56px;
    height: 56px;
  }

  .summary-meta-line {
    font-size: var(--vipr-font-size-caption);
  }

  .summary-module-chip {
    height: 30px;
    max-width: min(54vw, 220px);
    font-size: var(--vipr-font-size-caption);
  }
}
</style>
