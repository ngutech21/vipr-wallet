import { ref } from 'vue'
import type { DiscoverySelectionPayload, Federation } from 'src/types/federation'

export type FederationJoinBackTarget = 'invite' | 'discover'

export function useFederationJoinFlow() {
  const showSelection = ref(false)
  const showDiscover = ref(false)
  const showAdd = ref(false)
  const selectedInviteCode = ref<string | null>(null)
  const selectedPreviewFederation = ref<Federation | null>(null)
  const addFederationBackTarget = ref<FederationJoinBackTarget>('invite')
  const pendingDiscoverySelection = ref<DiscoverySelectionPayload | null>(null)

  function openSelection() {
    showSelection.value = true
  }

  function closeSelection() {
    showSelection.value = false
  }

  function openDiscover() {
    showDiscover.value = true
  }

  function closeDiscover() {
    showDiscover.value = false
  }

  function openAddFederation() {
    resetAddFederationState()
    showAdd.value = true
  }

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

  function closeAddFederation() {
    showAdd.value = false
    resetAddFederationState()
  }

  function returnToDiscovery() {
    showAdd.value = false
    resetAddFederationState()
    showDiscover.value = true
  }

  function applyDiscoverySelection(payload: DiscoverySelectionPayload) {
    selectedInviteCode.value = payload.inviteCode
    selectedPreviewFederation.value = payload.prefetchedFederation ?? null
    addFederationBackTarget.value = 'discover'
    pendingDiscoverySelection.value = null
    showAdd.value = true
  }

  function resetAddFederationState() {
    selectedInviteCode.value = null
    selectedPreviewFederation.value = null
    addFederationBackTarget.value = 'invite'
    pendingDiscoverySelection.value = null
  }

  return {
    showSelection,
    showDiscover,
    showAdd,
    selectedInviteCode,
    selectedPreviewFederation,
    addFederationBackTarget,
    openSelection,
    closeSelection,
    openDiscover,
    closeDiscover,
    openAddFederation,
    openAddFederationPreview,
    onDiscoverHide,
    closeAddFederation,
    returnToDiscovery,
  }
}

export type FederationJoinFlow = ReturnType<typeof useFederationJoinFlow>
