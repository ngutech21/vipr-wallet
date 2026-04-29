<template>
  <q-dialog
    :model-value="flow.showSelection.value"
    position="bottom"
    transition-show="slide-up"
    transition-hide="slide-down"
    @update:model-value="setSelectionOpen"
  >
    <AddFederationSelection
      v-if="flow.showSelection.value"
      @close="flow.closeSelection"
      @show-discover="flow.openDiscover"
      @show-add="flow.openAddFederation"
    />
  </q-dialog>

  <q-dialog
    :model-value="flow.showDiscover.value"
    position="bottom"
    @update:model-value="setDiscoverOpen"
    @hide="flow.onDiscoverHide"
  >
    <DiscoverFederations
      v-if="flow.showDiscover.value"
      :visible="flow.showDiscover.value"
      @close="flow.closeDiscover"
      @show-add="flow.openAddFederationPreview"
    />
  </q-dialog>

  <q-dialog :model-value="flow.showAdd.value" position="bottom" @update:model-value="setAddOpen">
    <AddFederation
      v-if="flow.showAdd.value"
      :back-target="flow.addFederationBackTarget.value"
      :initial-invite-code="flow.selectedInviteCode.value"
      :initial-preview-federation="flow.selectedPreviewFederation.value"
      :auto-preview="flow.selectedInviteCode.value != null"
      @close="flow.closeAddFederation"
      @back="flow.returnToDiscovery"
    />
  </q-dialog>
</template>

<script setup lang="ts">
import AddFederation from 'src/components/AddFederation.vue'
import AddFederationSelection from 'src/components/AddFederationSelection.vue'
import DiscoverFederations from 'src/components/DiscoverFederations.vue'
import type { FederationJoinFlow } from 'src/composables/useFederationJoinFlow'

defineOptions({
  name: 'FederationJoinDialogs',
})

const props = defineProps<{
  flow: FederationJoinFlow
}>()

function setSelectionOpen(value: boolean) {
  if (value) {
    return
  }

  props.flow.closeSelection()
}

function setDiscoverOpen(value: boolean) {
  if (value) {
    return
  }

  props.flow.closeDiscover()
}

function setAddOpen(value: boolean) {
  if (value) {
    return
  }

  props.flow.closeAddFederation()
}
</script>
