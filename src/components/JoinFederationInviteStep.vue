<template>
  <div class="invite-step q-pa-md" data-testid="join-federation-invite-step">
    <div class="invite-step__intro q-mb-lg">
      <div class="text-h6 text-weight-medium">Enter or scan an invite code</div>
      <div class="text-body2 text-grey-5 q-mt-sm">
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
      data-testid="invite-code-input"
    />

    <div class="row justify-between full-width q-mt-md">
      <q-btn
        flat
        label="Scan QR"
        icon="qr_code_scanner"
        color="primary"
        :to="'/scan'"
        class="q-pl-none"
        data-testid="add-federation-scan-btn"
      />
      <q-btn
        flat
        label="Paste"
        icon="content_paste"
        color="primary"
        class="q-pr-none"
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
