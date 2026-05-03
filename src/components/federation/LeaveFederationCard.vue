<template>
  <section class="leave-section">
    <div class="leave-section__title">Danger zone</div>
    <div class="leave-section__copy">
      Leaving removes local wallet data for this federation from this device.
    </div>
    <q-btn
      label="Leave Federation"
      color="negative"
      outline
      icon="logout"
      class="leave-action__button vipr-btn vipr-btn--md"
      data-testid="federation-details-leave-btn"
      @click="confirmLeave = true"
    />
  </section>

  <q-dialog v-model="confirmLeave">
    <q-card>
      <q-card-section class="leave-dialog-header">
        <q-avatar icon="warning" color="negative" text-color="white" />
        <span class="leave-dialog-title">Leave Federation</span>
      </q-card-section>

      <q-card-section>
        Are you sure you want to leave this federation? This action cannot be undone.
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          flat
          label="Cancel"
          color="primary"
          v-close-popup
          data-testid="federation-details-leave-cancel-btn"
        />
        <q-btn
          flat
          label="Leave"
          color="negative"
          v-close-popup
          data-testid="federation-details-leave-confirm-btn"
          @click="emit('leave')"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineOptions({
  name: 'LeaveFederationCard',
})

const emit = defineEmits<{
  leave: []
}>()

const confirmLeave = ref(false)
</script>

<style scoped>
.leave-section {
  display: grid;
  gap: var(--vipr-space-3);
  padding-top: var(--vipr-space-4);
  border-top: 1px solid rgba(255, 67, 99, 0.28);
}

.leave-section__title {
  color: var(--vipr-color-negative);
  font-size: var(--vipr-font-size-body);
  font-weight: 700;
}

.leave-section__copy {
  color: var(--vipr-text-muted);
  font-size: var(--vipr-font-size-caption);
  line-height: var(--vipr-line-height-body);
}

.leave-action__button {
  width: 100%;
}

.leave-dialog-header {
  display: flex;
  align-items: center;
}

.leave-dialog-title {
  margin-left: var(--vipr-federation-detail-dialog-title-gap);
}
</style>
