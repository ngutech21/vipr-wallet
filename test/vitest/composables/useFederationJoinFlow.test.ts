import { describe, expect, it } from 'vitest'
import { useFederationJoinFlow } from 'src/composables/useFederationJoinFlow'
import type { Federation } from 'src/types/federation'

const previewFederation: Federation = {
  title: 'Preview Federation',
  inviteCode: 'fed11preview',
  federationId: 'preview-fed',
  modules: [],
}

describe('useFederationJoinFlow', () => {
  it('opens and closes the entry dialogs independently', () => {
    const flow = useFederationJoinFlow()

    flow.openSelection()
    flow.openDiscover()

    expect(flow.showSelection.value).toBe(true)
    expect(flow.showDiscover.value).toBe(true)

    flow.closeSelection()
    flow.closeDiscover()

    expect(flow.showSelection.value).toBe(false)
    expect(flow.showDiscover.value).toBe(false)
  })

  it('opens the manual add flow with a clean invite state', () => {
    const flow = useFederationJoinFlow()

    flow.openAddFederationPreview({
      inviteCode: 'fed11preview',
      prefetchedFederation: previewFederation,
    })
    flow.closeAddFederation()
    flow.openAddFederation()

    expect(flow.showAdd.value).toBe(true)
    expect(flow.selectedInviteCode.value).toBeNull()
    expect(flow.selectedPreviewFederation.value).toBeNull()
    expect(flow.addFederationBackTarget.value).toBe('invite')
  })

  it('waits for discovery to hide before showing a selected preview', () => {
    const flow = useFederationJoinFlow()

    flow.openDiscover()
    flow.openAddFederationPreview({
      inviteCode: 'fed11preview',
      prefetchedFederation: previewFederation,
    })

    expect(flow.showDiscover.value).toBe(false)
    expect(flow.showAdd.value).toBe(false)

    flow.onDiscoverHide()

    expect(flow.showAdd.value).toBe(true)
    expect(flow.selectedInviteCode.value).toBe('fed11preview')
    expect(flow.selectedPreviewFederation.value).toStrictEqual(previewFederation)
    expect(flow.addFederationBackTarget.value).toBe('discover')
  })

  it('returns from a discovery preview back to discovery and resets add state', () => {
    const flow = useFederationJoinFlow()

    flow.openAddFederationPreview({
      inviteCode: 'fed11preview',
      prefetchedFederation: previewFederation,
    })
    flow.returnToDiscovery()

    expect(flow.showAdd.value).toBe(false)
    expect(flow.showDiscover.value).toBe(true)
    expect(flow.selectedInviteCode.value).toBeNull()
    expect(flow.selectedPreviewFederation.value).toBeNull()
    expect(flow.addFederationBackTarget.value).toBe('invite')
  })
})
