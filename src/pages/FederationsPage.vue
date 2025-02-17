<template>
  <q-page class="column q-px-md">
    <div class="text-h6 q-pt-md q-mb-md">Federations</div>

    <q-card flat bordered>
      <q-card-section class="q-pa-none">
        <FederationList />
      </q-card-section>
    </q-card>

    <q-dialog
      v-model="showAddFederationOverlay"
      position="bottom"
      transition-show="slide-up"
      transition-hide="slide-down"
    >
      <AddFederationPage @close="showAddFederationOverlay = false" />
    </q-dialog>

    <q-page-sticky position="bottom-right" :offset="[18, 18]">
      <q-btn fab icon="add" color="primary" @click="showAddFederationOverlay = true" />
    </q-page-sticky>
  </q-page>
</template>

<script setup lang="ts">
import FederationList from 'src/components/FederationList.vue'
import { ref } from 'vue'
import AddFederationPage from './AddFederationPage.vue'
const showAddFederationOverlay = ref(false)
</script>

<style scoped>
.q-card {
  background-color: rgba(255, 255, 255, 0.05);
}
</style>
