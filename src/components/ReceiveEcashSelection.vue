<template>
  <ModalCard title="Receive eCash" @close="emit('close')">
    <div class="selection-sheet q-pa-md">
      <div class="selection-sheet__intro text-body2 text-grey-5">
        Choose how you want to receive funds into your current federation.
      </div>

      <div class="selection-sheet__options">
        <BottomSheetOptionCard
          title="Receive via Onchain"
          description="Generate a Bitcoin address to receive funds via an onchain transaction"
          icon="currency_bitcoin"
          icon-color="orange"
          data-testid="receive-onchain-card"
          @select="onReceiveOnchain"
        />

        <BottomSheetOptionCard
          title="Receive via Lightning"
          description="Generate a Lightning invoice to receive eCash directly from the Lightning network"
          icon="flash_on"
          icon-color="warning"
          data-testid="receive-lightning-card"
          @select="onReceiveLightning"
        />

        <BottomSheetOptionCard
          title="Receive Offline eCash"
          description="Generate a QR code to receive eCash from another wallet without using the internet"
          icon="swap_horiz"
          icon-color="primary"
          data-testid="receive-offline-card"
          @select="onReceiveOffline"
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

async function onReceiveOnchain() {
  emit('close')
  await router.push({ name: '/receive-onchain' })
}

async function onReceiveLightning() {
  emit('close')
  await router.push({ name: '/receive' })
}

async function onReceiveOffline() {
  emit('close')
  await router.push({ name: '/receive-ecash' })
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
