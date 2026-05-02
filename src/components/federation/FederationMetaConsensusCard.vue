<template>
  <div>
    <div class="vipr-section-title federation-section-title">Consensus Metadata</div>
    <q-card
      flat
      class="federation-card vipr-surface-card vipr-surface-card--subtle"
      data-testid="federation-meta-consensus-card"
    >
      <q-card-section>
        <div v-if="isLoading" class="meta-consensus-state vipr-caption">
          Loading metadata from the Meta module...
        </div>

        <div v-else-if="error != null" class="meta-consensus-state meta-consensus-state--error">
          {{ error }}
        </div>

        <div v-else class="vipr-detail-list">
          <div class="vipr-detail-row">
            <div class="vipr-detail-label">Revision</div>
            <div class="vipr-detail-value">
              {{ metadata?.revision ?? 'None' }}
            </div>
          </div>

          <div class="vipr-detail-row">
            <div class="vipr-detail-label">Keys</div>
            <div class="vipr-detail-value">
              <template v-if="metadataKeys.length > 0">
                {{ metadataKeys.join(', ') }}
              </template>
              <template v-else>None</template>
            </div>
          </div>

          <div
            v-for="[key, value] in metadataEntries"
            :key="key"
            class="vipr-detail-row vipr-detail-row--block"
          >
            <div class="vipr-detail-label">{{ key }}</div>
            <pre class="meta-consensus-value">{{ formatMetadataValue(value) }}</pre>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { JSONValue, MetaConsensusValue, JSONObject } from '@fedimint/core'

defineOptions({
  name: 'FederationMetaConsensusCard',
})

const props = defineProps<{
  metadata: MetaConsensusValue<JSONObject> | null
  isLoading: boolean
  error: string | null
}>()

const metadataEntries = computed(() => {
  return Object.entries(props.metadata?.value ?? {}).sort(([left], [right]) =>
    left.localeCompare(right),
  )
})

const metadataKeys = computed(() => metadataEntries.value.map(([key]) => key))

function formatMetadataValue(value: JSONValue): string {
  if (typeof value === 'string') {
    return value
  }

  return JSON.stringify(value, null, 2)
}
</script>

<style scoped>
.meta-consensus-state {
  color: var(--vipr-text-muted);
  line-height: var(--vipr-line-height-body);
}

.meta-consensus-state--error {
  color: var(--q-negative);
}

.meta-consensus-value {
  min-width: 0;
  margin: var(--vipr-space-2) 0 0;
  color: var(--vipr-text-secondary);
  font-family: var(--vipr-font-family-mono);
  font-size: var(--vipr-font-size-label);
  line-height: var(--vipr-line-height-body);
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
