<template>
  <section v-if="inviteCode" class="federation-invite">
    <div class="federation-invite__eyebrow">Invite</div>
    <div class="federation-invite__row" data-testid="federation-details-invite-container">
      <button
        type="button"
        class="federation-invite__qr-trigger"
        aria-label="Open larger Invite link"
        data-testid="federation-details-invite-qr-zoom-btn"
        @click="showZoomedQr = true"
      >
        <div class="federation-invite__qr-surface">
          <qrcode-vue
            :value="inviteCode"
            level="M"
            render-as="svg"
            :size="0"
            class="federation-invite__qr"
          />
        </div>
      </button>

      <div class="federation-invite__copy">
        <div class="federation-invite__title">Invite link</div>
        <div class="federation-invite__description">Scan or share this federation invite.</div>
      </div>

      <div class="federation-invite__actions">
        <q-btn
          icon="content_copy"
          flat
          round
          aria-label="Copy federation invite code"
          data-testid="federation-details-copy-invite-btn"
          @click="copyInviteCode"
        />
        <q-btn
          icon="share"
          flat
          round
          aria-label="Share federation invite code"
          data-testid="federation-details-share-invite-btn"
          @click="shareInviteCode"
        />
      </div>
    </div>

    <input
      class="federation-invite__value"
      :value="inviteCode"
      readonly
      aria-label="Federation invite code"
      data-testid="federation-details-invite-input"
    />

    <q-dialog v-model="showZoomedQr">
      <q-card class="vipr-qr-dialog-card vipr-surface-card vipr-surface-card--strong">
        <q-card-section class="vipr-qr-dialog-header">
          <div class="vipr-qr-dialog-title">Invite link</div>
          <q-btn
            icon="close"
            flat
            round
            aria-label="Close QR code"
            data-testid="federation-details-invite-qr-zoom-close-btn"
            @click="showZoomedQr = false"
          />
        </q-card-section>
        <q-card-section class="vipr-qr-dialog-body">
          <div class="vipr-qr-dialog-surface">
            <qrcode-vue
              :value="inviteCode"
              level="M"
              render-as="svg"
              :size="0"
              class="vipr-qr-code"
            />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import QrcodeVue from 'qrcode.vue'
import { useCopyShare } from 'src/composables/useCopyShare'
import { logger } from 'src/services/logger'

defineOptions({
  name: 'FederationInviteCard',
})

const props = defineProps<{
  inviteCode: string
  federationTitle?: string | undefined
}>()

const showZoomedQr = ref(false)

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

<style scoped>
.federation-invite {
  min-width: 0;
  display: grid;
  gap: var(--vipr-space-2);
}

.federation-invite__eyebrow {
  color: var(--vipr-text-muted);
  font-size: var(--vipr-font-size-label);
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: var(--vipr-line-height-tight);
  text-transform: uppercase;
}

.federation-invite__row {
  min-width: 0;
  display: grid;
  grid-template-columns: 78px minmax(0, 1fr) max-content;
  align-items: center;
  gap: var(--vipr-space-3);
  padding: var(--vipr-space-2) 0 var(--vipr-space-3);
  border-top: 1px solid var(--vipr-detail-separator);
}

.federation-invite__qr-trigger {
  padding: 0;
  border: 0;
  background: transparent;
  cursor: zoom-in;
}

.federation-invite__qr-surface {
  width: 78px;
  aspect-ratio: 1;
  padding: var(--vipr-space-1);
  border-radius: var(--vipr-radius-sm);
  background: var(--vipr-qr-surface-bg);
}

.federation-invite__qr {
  display: block;
  width: 100%;
  height: 100%;
}

.federation-invite__copy {
  min-width: 0;
}

.federation-invite__title {
  color: var(--vipr-text-primary);
  font-size: var(--vipr-font-size-body);
  font-weight: 700;
  line-height: var(--vipr-line-height-tight);
}

.federation-invite__description {
  margin-top: var(--vipr-space-1);
  color: var(--vipr-text-muted);
  font-size: var(--vipr-font-size-caption);
  line-height: var(--vipr-line-height-body);
}

.federation-invite__actions {
  min-width: 0;
  display: flex;
  gap: var(--vipr-space-1);
  justify-self: end;
}

.federation-invite__actions :deep(.q-btn) {
  width: var(--vipr-size-touch-min);
  min-width: var(--vipr-size-touch-min);
  height: var(--vipr-size-touch-min);
  background: var(--vipr-color-input-bg);
  border: 1px solid var(--vipr-color-input-border);
}

.federation-invite__actions :deep(.q-icon) {
  font-size: 1.1rem;
}

.federation-invite__value {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

@media (max-width: 480px) {
  .federation-invite__row {
    grid-template-columns: 64px minmax(0, 1fr) max-content;
    gap: var(--vipr-space-2);
  }

  .federation-invite__qr-surface {
    width: 64px;
  }

  .federation-invite__actions :deep(.q-btn) {
    min-width: 40px;
    min-height: 40px;
  }
}

@media (max-width: 360px) {
  .federation-invite__row {
    grid-template-columns: 52px minmax(0, 1fr) max-content;
    gap: var(--vipr-space-2);
  }

  .federation-invite__qr-surface {
    width: 52px;
  }

  .federation-invite__actions :deep(.q-btn) {
    min-width: 36px;
    min-height: 36px;
  }
}
</style>
