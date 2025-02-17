<template>
  <q-page>
    <q-dialog
      v-model="showAddFederationOverlay"
      position="bottom"
      transition-show="slide-up"
      transition-hide="slide-down"
    >
      <AddFederationPage @close="showAddFederationOverlay = false" />
    </q-dialog>
    <q-card class="full-width">
      <q-card-section class="row items-center justify-between">
        <div class="text-h6">Federations</div>
      </q-card-section>
    </q-card>

    <div class="q-pa-md">
      <FederationList />

      <q-page-sticky position="bottom-right" :offset="[30, 30]">
        <q-btn fab icon="add" color="primary" @click="showAddFederationOverlay = true" />
      </q-page-sticky>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import FederationList from 'src/components/FederationList.vue'
import { ref } from 'vue'
import AddFederationPage from './AddFederationPage.vue'
const showAddFederationOverlay = ref(false)
</script>
