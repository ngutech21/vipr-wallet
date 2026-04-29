<template>
  <template v-if="hasMessages">
    <div class="vipr-section-title federation-section-title">Messages</div>
    <q-card flat class="federation-card vipr-surface-card vipr-surface-card--subtle">
      <q-card-section>
        <div class="vipr-detail-list">
          <template v-if="metadata?.preview_message">
            <div class="vipr-detail-row vipr-detail-row--block">
              <div class="vipr-detail-label">Preview Message</div>
              <div class="vipr-body federation-message-copy">
                {{ metadata.preview_message }}
              </div>
            </div>
          </template>

          <template v-if="metadata?.popup_countdown_message">
            <div class="vipr-detail-row vipr-detail-row--block">
              <div class="vipr-detail-label">End Message</div>
              <div class="vipr-body federation-message-copy">
                {{ metadata.popup_countdown_message }}
              </div>
              <div
                v-if="metadata?.popup_end_timestamp"
                class="vipr-caption federation-message-copy"
              >
                Ends: {{ formatDate(metadata.popup_end_timestamp) }}
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
    (props.metadata?.preview_message != null && props.metadata.preview_message !== '') ||
    (props.metadata?.popup_countdown_message != null &&
      props.metadata.popup_countdown_message !== '')
  )
})

function formatDate(timestamp: string) {
  try {
    return new Date(timestamp).toLocaleString()
  } catch (error) {
    logger.error('Failed to parse metadata date', error)
    return timestamp
  }
}
</script>

<style scoped>
.federation-message-copy {
  margin-top: var(--vipr-federation-detail-message-gap);
}
</style>
