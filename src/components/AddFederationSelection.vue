<template>
  <ModalCard
    title="Join a Federation"
    data-testid="join-federation-selection"
    @close="emit('close')"
  >
    <div class="vipr-selection-sheet">
      <div class="vipr-selection-sheet__intro text-body2">
        Join a federation you already trust or browse community recommendations first.
      </div>

      <div class="vipr-selection-sheet__options">
        <BottomSheetOptionCard
          title="Discover federations"
          description="Browse federations recommended by Nostr users at observer.fedimint.org."
          icon="search"
          icon-color="primary"
          data-testid="join-discover-federation-card"
          @select="onDiscover"
        />

        <BottomSheetOptionCard
          title="Join a trusted federation"
          description="Scan a QR code or paste an invite code for a federation you already know."
          icon="add_circle"
          icon-color="primary"
          data-testid="join-trusted-federation-card"
          @select="onAdd"
        />
      </div>
    </div>
  </ModalCard>
</template>

<script setup lang="ts">
import ModalCard from './ModalCard.vue'
import BottomSheetOptionCard from './BottomSheetOptionCard.vue'

const emit = defineEmits<{
  close: []
  showDiscover: []
  showAdd: []
}>()

function onDiscover() {
  emit('close')
  emit('showDiscover')
}

function onAdd() {
  emit('close')
  emit('showAdd')
}
</script>
