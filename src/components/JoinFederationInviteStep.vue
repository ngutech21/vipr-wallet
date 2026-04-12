<template>
  <q-form class="q-pa-md" @submit.prevent="emit('submit')">
    <q-input
      filled
      :model-value="inviteCode"
      @update:model-value="emit('update:inviteCode', $event)"
      label="Enter Fedimint Invitecode"
      :rules="[(val) => !!val || 'Invitecode is required']"
      type="textarea"
      autogrow
      data-testid="add-federation-invite-input"
    />

    <div class="row justify-between full-width q-mt-none">
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

    <div class="q-mt-xl">
      <q-btn
        type="submit"
        label="Preview Federation"
        color="primary"
        class="full-width"
        data-testid="add-federation-preview-btn"
        :disable="isSubmitting"
        :loading="isSubmitting"
        :data-busy="isSubmitting ? 'true' : 'false'"
      />
    </div>
  </q-form>
</template>

<script setup lang="ts">
defineProps<{
  inviteCode: string
  isSubmitting: boolean
}>()

const emit = defineEmits<{
  paste: []
  submit: []
  'update:inviteCode': [value: string | number | null]
}>()
</script>
