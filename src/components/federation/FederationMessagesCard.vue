<template>
  <template v-if="hasMessages">
    <q-card flat class="federation-card vipr-surface-card vipr-surface-card--subtle">
      <q-card-section>
        <div class="vipr-detail-list">
          <template v-if="metadata?.welcomeMessage">
            <div class="vipr-detail-row vipr-detail-row--block">
              <div class="vipr-detail-label">Welcome Message</div>
              <div class="vipr-body federation-message-copy">
                {{ metadata.welcomeMessage }}
              </div>
            </div>
          </template>

          <template v-if="metadata?.previewMessage">
            <div class="vipr-detail-row vipr-detail-row--block">
              <div class="vipr-detail-label">Preview Message</div>
              <div class="vipr-body federation-message-copy">
                {{ metadata.previewMessage }}
              </div>
            </div>
          </template>

          <template v-if="metadata?.popupCountdownMessage">
            <div class="vipr-detail-row vipr-detail-row--block">
              <div class="vipr-detail-label">End Message</div>
              <div class="vipr-body federation-message-copy">
                {{ metadata.popupCountdownMessage }}
              </div>
              <div v-if="metadata?.popupEndTimestamp" class="vipr-caption federation-message-copy">
                Ends: {{ formatDate(metadata.popupEndTimestamp) }}
              </div>
            </div>
          </template>
        </div>
      </q-card-section>
    </q-card>
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FederationMeta } from 'src/types/federation'
import { logger } from 'src/services/logger'

defineOptions({
  name: 'FederationMessagesCard',
})

const props = defineProps<{
  metadata?: FederationMeta | undefined
  federationId?: string | undefined
}>()

const hasMessages = computed(() => {
  logger.federation.debug('Checking for messages in federation metadata', {
    federationId: props.federationId,
  })
  return (
    (props.metadata?.welcomeMessage != null && props.metadata.welcomeMessage !== '') ||
    (props.metadata?.previewMessage != null && props.metadata.previewMessage !== '') ||
    (props.metadata?.popupCountdownMessage != null && props.metadata.popupCountdownMessage !== '')
  )
})

function formatDate(timestamp: number) {
  try {
    return new Date(timestamp * 1000).toLocaleString()
  } catch (error) {
    logger.error('Failed to parse metadata date', error)
    return String(timestamp)
  }
}
</script>

<style scoped>
.federation-message-copy {
  margin-top: var(--vipr-federation-detail-message-gap);
}
</style>
