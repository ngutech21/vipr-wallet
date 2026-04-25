<template>
  <ModalCard title="Receive ecash" @close="emit('close')">
    <div class="vipr-selection-sheet">
      <div class="vipr-selection-sheet__intro">
        Choose how you want to receive funds into your current federation.
      </div>

      <div class="vipr-selection-sheet__options">
        <BottomSheetOptionCard
          title="Receive via On-chain"
          description="Generate a Bitcoin address to receive funds via an on-chain transaction."
          icon="currency_bitcoin"
          icon-color="orange"
          data-testid="receive-onchain-card"
          @select="onReceiveOnchain"
        />

        <BottomSheetOptionCard
          title="Receive via Lightning"
          description="Generate a Lightning invoice to receive ecash directly from the Lightning network."
          icon="flash_on"
          icon-color="warning"
          data-testid="receive-lightning-card"
          @select="onReceiveLightning"
        />

        <BottomSheetOptionCard
          title="Receive offline ecash"
          description="Generate a QR code to receive ecash from another wallet without using the internet."
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
