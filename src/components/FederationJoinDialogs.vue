<template>
  <q-dialog
    :model-value="showSelection"
    position="bottom"
    transition-show="slide-up"
    transition-hide="slide-down"
    @update:model-value="setSelectionOpen"
  >
    <AddFederationSelection
      v-if="showSelection"
      @close="flow.closeSelection"
      @show-discover="flow.openDiscover"
      @show-add="flow.openAddFederation"
    />
  </q-dialog>

  <q-dialog
    :model-value="showDiscover"
    position="bottom"
    @update:model-value="setDiscoverOpen"
    @hide="flow.onDiscoverHide"
  >
    <DiscoverFederations
      v-if="showDiscover"
      :visible="showDiscover"
      @close="flow.closeDiscover"
      @show-add="flow.openAddFederationPreview"
    />
  </q-dialog>

  <q-dialog :model-value="showAdd" position="bottom" @update:model-value="setAddOpen">
    <AddFederation
      v-if="showAdd"
      :back-target="addFederationBackTarget"
      :initial-invite-code="selectedInviteCode"
      :initial-preview-federation="selectedPreviewFederation"
      :auto-preview="selectedInviteCode != null"
      @close="flow.closeAddFederation"
      @back="flow.returnToDiscovery"
    />
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
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

const showSelection = computed(() => props.flow.showSelection.value)
const showDiscover = computed(() => props.flow.showDiscover.value)
const showAdd = computed(() => props.flow.showAdd.value)
const addFederationBackTarget = computed(() => props.flow.addFederationBackTarget.value)
const selectedInviteCode = computed(() => props.flow.selectedInviteCode.value)
const selectedPreviewFederation = computed(() => props.flow.selectedPreviewFederation.value)

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
