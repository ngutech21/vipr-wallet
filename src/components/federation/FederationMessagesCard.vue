<template>
  <template v-if="hasMessages">
    <section class="federation-notice">
      <q-icon name="info" class="federation-notice__icon" />
      <div class="federation-notice__body">
        <div class="federation-notice__title">Notice</div>
        <div v-if="metadata?.welcomeMessage" class="federation-notice__copy">
          {{ shortWelcomeMessage }}
        </div>
        <div v-if="metadata?.popupEndTimestamp" class="federation-notice__date">
          Ends {{ formatDate(metadata.popupEndTimestamp) }}
        </div>
      </div>
    </section>
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
    (props.metadata?.popupCountdownMessage != null && props.metadata.popupCountdownMessage !== '')
  )
})

const shortWelcomeMessage = computed(() => {
  const message = props.metadata?.welcomeMessage ?? ''
  const [firstSentence] = message.split(/(?<=[.!?])\s+/u)
  return firstSentence !== '' ? firstSentence : message
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
.federation-notice {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--vipr-space-2);
  padding: var(--vipr-space-3);
  border: 1px solid var(--vipr-surface-card-border-subtle);
  border-radius: var(--vipr-radius-md);
  background: var(--vipr-surface-card-bg-subtle);
  box-shadow: var(--vipr-surface-card-shadow-subtle);
  overflow: hidden;
}

.federation-notice::before {
  content: '';
  position: absolute;
  top: var(--vipr-space-2);
  bottom: var(--vipr-space-2);
  left: 0;
  width: 1px;
  background: var(--vipr-color-primary-accent);
}

.federation-notice__icon {
  margin-top: 1px;
  color: var(--vipr-color-primary-accent);
  font-size: 1rem;
}

.federation-notice__body {
  min-width: 0;
  display: grid;
  gap: var(--vipr-space-1);
}

.federation-notice__title {
  color: var(--vipr-color-primary-accent);
  font-size: var(--vipr-font-size-caption);
  font-weight: 700;
  line-height: var(--vipr-line-height-tight);
}

.federation-notice__copy,
.federation-notice__date {
  max-width: 58ch;
  color: var(--vipr-text-secondary);
  font-size: var(--vipr-font-size-caption);
  line-height: var(--vipr-line-height-body);
}

.federation-notice__date {
  color: var(--vipr-text-muted);
  font-size: var(--vipr-font-size-caption);
}

@media (max-width: 480px) {
  .federation-notice {
    padding: var(--vipr-space-3);
    border-radius: var(--vipr-radius-sm);
  }

  .federation-notice__copy,
  .federation-notice__date {
    font-size: var(--vipr-font-size-caption);
  }
}
</style>
