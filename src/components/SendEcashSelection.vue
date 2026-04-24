<template>
  <ModalCard title="Send" @close="emit('close')">
    <div class="selection-sheet q-pa-md">
      <div class="selection-sheet__intro text-body2 text-grey-5">
        Choose how you want to send funds from your current federation balance.
      </div>

      <div class="selection-sheet__options">
        <BottomSheetOptionCard
          title="Send On-chain"
          description="Withdraw Bitcoin to an on-chain address or Bitcoin QR code."
          icon="currency_bitcoin"
          icon-color="orange"
          data-testid="send-onchain-card"
          @select="onSendOnchain"
        />

        <BottomSheetOptionCard
          title="Send via Lightning"
          description="Pay a Lightning invoice, address, or LNURL while online."
          icon="flash_on"
          icon-color="warning"
          data-testid="send-lightning-card"
          @select="onSendLightning"
        />

        <BottomSheetOptionCard
          title="Send offline ecash"
          description="Export ecash notes to share without a live internet connection."
          icon="swap_horiz"
          icon-color="primary"
          data-testid="send-offline-card"
          @select="onSendOffline"
        />
      </div>
    </div>
  </ModalCard>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import ModalCard from './ModalCard.vue'
import BottomSheetOptionCard from './BottomSheetOptionCard.vue'

const router = useRouter()
const emit = defineEmits<{
  close: []
}>()

async function onSendLightning() {
  emit('close')
  await router.push({ name: '/send' })
}

async function onSendOnchain() {
  emit('close')
  await router.push({ path: '/send-onchain' })
}

async function onSendOffline() {
  emit('close')
  await router.push({ name: '/send-ecash' })
}
</script>

<style scoped>
.selection-sheet {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.selection-sheet__options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
