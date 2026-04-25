<template>
  <div class="vipr-flow-step" data-testid="join-federation-invite-step">
    <div class="vipr-flow-step__intro">
      <div class="invite-step__title">Enter or scan an invite code</div>
      <div class="invite-step__copy">
        Only join federations you already trust. You can paste an invite code or scan a QR code to
        review the federation before joining.
      </div>
    </div>

    <q-input
      filled
      :model-value="inviteCode"
      @update:model-value="emit('update:inviteCode', $event)"
      label="Fedimint Invite Code"
      hint="Paste a code from a trusted source or scan a federation QR."
      :rules="[(val) => !!val || 'Invitecode is required']"
      type="textarea"
      autogrow
      dark
      class="vipr-input"
      data-testid="invite-code-input"
    />

    <div class="invite-step__actions">
      <q-btn
        flat
        label="Scan QR"
        icon="qr_code_scanner"
        color="primary"
        :to="'/scan'"
        class="invite-step__action invite-step__action--leading"
        data-testid="add-federation-scan-btn"
      />
      <q-btn
        flat
        label="Paste"
        icon="content_paste"
        color="primary"
        class="invite-step__action invite-step__action--trailing"
        data-testid="add-federation-paste-btn"
        @click="emit('paste')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  inviteCode: string
}>()

const emit = defineEmits<{
  paste: []
  'update:inviteCode': [value: string | number | null]
}>()
</script>

<style scoped>
.invite-step__title {
  font-size: 1.25rem;
  font-weight: 500;
  line-height: var(--vipr-line-height-tight);
}

.invite-step__copy {
  margin-top: var(--vipr-space-2);
  color: var(--vipr-text-secondary);
  font-size: var(--vipr-font-size-body);
  line-height: var(--vipr-line-height-body);
}

.invite-step__actions {
  display: flex;
  width: 100%;
  justify-content: space-between;
  margin-top: var(--vipr-space-4);
}

.invite-step__action--leading {
  padding-left: 0;
}

.invite-step__action--trailing {
  padding-right: 0;
}
</style>
