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
      <DiscoverFederations :visible="showDiscover" @close="showDiscover = false" />
    </q-dialog>

    <q-dialog v-model="showAdd" position="bottom">
      <AddFederation @close="showAdd = false" />
    </q-dialog>

    <q-toolbar class="header-section">
      <q-toolbar-title class="text-center">Federations</q-toolbar-title>
    </q-toolbar>

    <div class="q-pa-md">
      <FederationList />

      <q-page-sticky position="bottom-right" :offset="[30, 30]">
        <q-btn
          fab
          icon="add"
          color="primary"
          :aria-expanded="showSelection"
          @click="showSelection = true"
          data-testid="add-federation-button"
        />
      </q-page-sticky>
    </div>
  </q-page>
</template>

<script setup lang="ts">
defineOptions({
  name: 'FederationsPage',
})

import FederationList from 'src/components/FederationList.vue'
import { ref } from 'vue'
import AddFederationSelection from 'src/components/AddFederationSelection.vue'
import DiscoverFederations from 'src/components/DiscoverFederations.vue'
import AddFederation from 'src/components/AddFederation.vue'

const showSelection = ref(false)
const showDiscover = ref(false)
const showAdd = ref(false)
</script>
