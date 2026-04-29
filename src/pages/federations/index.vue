<template>
  <q-page data-testid="federations-page">
    <FederationJoinDialogs :flow="federationJoinFlow" />

    <div class="page-content federations-page-content">
      <FederationList />

      <div class="add-federation-fab">
        <q-btn
          fab
          icon="add"
          color="primary"
          unelevated
          class="add-federation-fab__button vipr-fab--primary"
          :aria-expanded="showSelection"
          @click="federationJoinFlow.openSelection"
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

import FederationJoinDialogs from 'src/components/FederationJoinDialogs.vue'
import FederationList from 'src/components/FederationList.vue'
import { useFederationJoinFlow } from 'src/composables/useFederationJoinFlow'

const federationJoinFlow = useFederationJoinFlow()
const { showSelection } = federationJoinFlow
</script>

<style scoped>
.page-content {
  position: relative;
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
}

.federations-page-content {
  padding: calc(var(--vipr-space-4) + env(safe-area-inset-top)) var(--vipr-space-4)
    var(--vipr-space-4);
}

.add-federation-fab {
  position: fixed;
  right: max(var(--vipr-space-6), calc((100vw - 700px) / 2 + var(--vipr-space-6)));
  bottom: calc(120px + env(safe-area-inset-bottom));
  z-index: 1200;
}

.add-federation-fab__button :deep(.q-icon) {
  font-size: 1.6rem;
}
</style>
