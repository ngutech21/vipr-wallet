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

    <q-dialog v-model="showDiscover" position="bottom">
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

function openAddFederationPreview(payload: DiscoverySelectionPayload) {
  selectedInviteCode.value = payload.inviteCode
  selectedPreviewFederation.value = payload.prefetchedFederation ?? null
  addFederationBackTarget.value = 'discover'
  showDiscover.value = false
  showAdd.value = true
}

function closeAddFederation() {
  showAdd.value = false
  selectedInviteCode.value = null
  selectedPreviewFederation.value = null
  addFederationBackTarget.value = 'invite'
}

function returnToDiscovery() {
  showAdd.value = false
  selectedInviteCode.value = null
  selectedPreviewFederation.value = null
  addFederationBackTarget.value = 'invite'
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
  bottom: calc(96px + env(safe-area-inset-bottom));
  z-index: 1200;
}
</style>
