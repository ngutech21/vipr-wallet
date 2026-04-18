<template>
  <q-page class="dark-gradient" data-testid="federations-page">
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
        @close="closeAddFederation"
        :initial-invite-code="selectedInviteCode"
        :auto-preview="selectedInviteCode != null"
      />
    </q-dialog>

    <q-toolbar class="header-section">
      <q-toolbar-title class="text-center">Federations</q-toolbar-title>
    </q-toolbar>

    <div class="q-pa-md">
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
import { ref } from 'vue'

const showSelection = ref(false)
const showDiscover = ref(false)
const showAdd = ref(false)
const selectedInviteCode = ref<string | null>(null)

function openAddFederationPreview(inviteCode: string) {
  selectedInviteCode.value = inviteCode
  showDiscover.value = false
  showAdd.value = true
}

function closeAddFederation() {
  showAdd.value = false
  selectedInviteCode.value = null
}
</script>

<style scoped>
.add-federation-fab {
  position: fixed;
  right: 24px;
  bottom: calc(96px + env(safe-area-inset-bottom));
  z-index: 1200;
}
</style>
