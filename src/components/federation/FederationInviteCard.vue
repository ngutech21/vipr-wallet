<template>
  <CopyableQrCard
    v-if="inviteCode"
    :value="inviteCode"
    eyebrow="Invite"
    heading=""
    description="Scan the QR code or share the invite with others to join the federation."
    input-aria-label="Federation invite code"
    test-id-prefix="federation-details-invite"
    card-class="federation-card vipr-surface-card--subtle vipr-qr-card--invite"
    compact
    :show-value="false"
    :enable-qr-zoom="true"
    input-test-id="federation-details-invite-input"
    copy-test-id="federation-details-copy-invite-btn"
    share-test-id="federation-details-share-invite-btn"
    @copy="copyInviteCode"
    @share="shareInviteCode"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CopyableQrCard from 'src/components/CopyableQrCard.vue'
import { useCopyShare } from 'src/composables/useCopyShare'
import { logger } from 'src/services/logger'

defineOptions({
  name: 'FederationInviteCard',
})

const props = defineProps<{
  inviteCode: string
  federationTitle?: string | undefined
}>()

const { copyToClipboard: copyInviteToClipboard, shareValue: shareFederationInvite } = useCopyShare({
  value: () => props.inviteCode,
  copySuccessMessage: 'Invite link copied to clipboard',
  copySuccessOptions: { timeout: 1000 },
  shareTitle: computed(() => `${props.federationTitle ?? 'Federation'} invite`),
  shareUnavailableMessage: 'Invite copied. Share is not available in this browser.',
  onCopyError: (error) => logger.error('Failed to copy federation invite code', error),
})

async function copyInviteCode() {
  if (props.inviteCode === '') {
    return
  }

  await copyInviteToClipboard()
}

async function shareInviteCode() {
  if (props.inviteCode === '') {
    return
  }

  logger.ui.debug('Sharing federation invite code')
  await shareFederationInvite()
}
</script>
