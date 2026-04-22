<template>
  <q-page data-testid="federations-page">
    <q-dialog
      v-model="showSelection"
      position="bottom"
      transition-show="slide-up"
      transition-hide="slide-down"
    >
      <AddFederationSelection
        @close="showSelection = false"
        @show-discover="showDiscover = true"
        @show-add="showAdd = true"
      />
    </q-dialog>

    <q-dialog v-model="showDiscover" position="bottom" @hide="onDiscoverHide">
      <DiscoverFederations
        :visible="showDiscover"
        @close="showDiscover = false"
        @show-add="openAddFederationPreview"
      />
    </q-dialog>

    <q-dialog v-model="showAdd" position="bottom">
      <AddFederation
        :back-target="addFederationBackTarget"
        @close="closeAddFederation"
        @back="returnToDiscovery"
        :initial-invite-code="selectedInviteCode"
        :initial-preview-federation="selectedPreviewFederation"
        :auto-preview="selectedInviteCode != null"
      />
    </q-dialog>

    <div class="page-content q-px-md q-pt-md q-pb-md">
      <FederationList />

      <div class="add-federation-fab">
        <q-btn
          fab
          icon="add"
          color="primary"
          unelevated
          class="add-federation-fab__button"
          :aria-expanded="showSelection"
          @click="showSelection = true"
          data-testid="add-federation-button"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
defineOptions({
  name: 'FederationsPage',
})

import AddFederation from 'src/components/AddFederation.vue'
import AddFederationSelection from 'src/components/AddFederationSelection.vue'
import DiscoverFederations from 'src/components/DiscoverFederations.vue'
import FederationList from 'src/components/FederationList.vue'
import type { DiscoverySelectionPayload, Federation } from 'src/types/federation'
import { ref } from 'vue'

const showSelection = ref(false)
const showDiscover = ref(false)
const showAdd = ref(false)
const selectedInviteCode = ref<string | null>(null)
const selectedPreviewFederation = ref<Federation | null>(null)
const addFederationBackTarget = ref<'invite' | 'discover'>('invite')
const pendingDiscoverySelection = ref<DiscoverySelectionPayload | null>(null)

function openAddFederationPreview(payload: DiscoverySelectionPayload) {
  pendingDiscoverySelection.value = payload
  if (showDiscover.value) {
    showDiscover.value = false
    return
  }
  applyDiscoverySelection(payload)
}

function onDiscoverHide() {
  if (pendingDiscoverySelection.value == null) {
    return
  }

  applyDiscoverySelection(pendingDiscoverySelection.value)
}

function applyDiscoverySelection(payload: DiscoverySelectionPayload) {
  selectedInviteCode.value = payload.inviteCode
  selectedPreviewFederation.value = payload.prefetchedFederation ?? null
  addFederationBackTarget.value = 'discover'
  pendingDiscoverySelection.value = null
  showAdd.value = true
}

function closeAddFederation() {
  showAdd.value = false
  selectedInviteCode.value = null
  selectedPreviewFederation.value = null
  addFederationBackTarget.value = 'invite'
  pendingDiscoverySelection.value = null
}

function returnToDiscovery() {
  showAdd.value = false
  selectedInviteCode.value = null
  selectedPreviewFederation.value = null
  addFederationBackTarget.value = 'invite'
  pendingDiscoverySelection.value = null
  showDiscover.value = true
}
</script>

<style scoped>
.page-content {
  position: relative;
}

.add-federation-fab {
  position: fixed;
  right: 24px;
  bottom: calc(120px + env(safe-area-inset-bottom));
  z-index: 1200;
}

.add-federation-fab__button {
  background:
    linear-gradient(135deg, rgba(162, 43, 255, 1), rgba(116, 0, 255, 0.96)),
    linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0));
  box-shadow:
    0 10px 24px rgba(111, 0, 255, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.16);
  color: white;
}

.add-federation-fab__button :deep(.q-icon) {
  font-size: 1.6rem;
}
</style>
