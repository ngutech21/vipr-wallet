import { describe, expect, it } from 'vitest'
import {
  getAddFederationPreview,
  getAddFederationStep,
  isAddFederationSubmitting,
  resolveInitialAddFederationState,
  resolveJoinFailure,
  resolvePreviewFailure,
  resolvePreviewSuccess,
  returnToInviteStep,
  startJoin,
  startPreview,
  updateInviteCode,
  type AddFederationState,
} from 'src/utils/addFederationState'
import type { Federation } from 'src/types/federation'

const federation = {
  title: 'Trusted Federation',
  inviteCode: 'fed11trusted',
  federationId: 'trusted-fed-id',
  modules: [],
} satisfies Federation

describe('add federation state', () => {
  it('resolves initial invite and prefetched preview states', () => {
    expect(resolveInitialAddFederationState({ initialInviteCode: 'fed11manual' })).toEqual({
      type: 'invite',
      inviteCode: 'fed11manual',
    })

    expect(
      resolveInitialAddFederationState({
        initialPreviewFederation: federation,
      }),
    ).toEqual({
      type: 'preview',
      inviteCode: federation.inviteCode,
      federation,
    })
  })

  it('updates invite code by clearing preview-related state', () => {
    const previewState = {
      type: 'preview',
      inviteCode: federation.inviteCode,
      federation,
    } satisfies AddFederationState

    expect(updateInviteCode(previewState, 'fed11new')).toEqual({
      type: 'invite',
      inviteCode: 'fed11new',
    })
    expect(updateInviteCode(previewState, null)).toEqual({
      type: 'invite',
      inviteCode: '',
    })
  })

  it('starts preview with a trimmed invite code', () => {
    expect(
      startPreview(
        {
          type: 'invite',
          inviteCode: ' fed11trusted ',
        },
        7,
      ),
    ).toEqual({
      type: 'previewing',
      inviteCode: 'fed11trusted',
      requestId: 7,
    })
  })

  it('applies only the current preview success', () => {
    const previewingState = {
      type: 'previewing',
      inviteCode: federation.inviteCode,
      requestId: 2,
    } satisfies AddFederationState

    expect(
      resolvePreviewSuccess(previewingState, {
        requestId: 2,
        inviteCode: federation.inviteCode,
        federation,
      }),
    ).toEqual({
      type: 'preview',
      inviteCode: federation.inviteCode,
      federation,
    })

    expect(
      resolvePreviewSuccess(
        {
          type: 'invite',
          inviteCode: 'fed11new',
        },
        {
          requestId: 2,
          inviteCode: federation.inviteCode,
          federation,
        },
      ),
    ).toEqual({
      type: 'invite',
      inviteCode: 'fed11new',
    })
  })

  it('applies only the current preview failure', () => {
    const previewingState = {
      type: 'previewing',
      inviteCode: federation.inviteCode,
      requestId: 2,
    } satisfies AddFederationState

    expect(
      resolvePreviewFailure(previewingState, {
        requestId: 2,
        inviteCode: federation.inviteCode,
        message: 'preview failed',
      }),
    ).toEqual({
      type: 'error',
      inviteCode: federation.inviteCode,
      message: 'preview failed',
    })

    expect(
      resolvePreviewFailure(previewingState, {
        requestId: 1,
        inviteCode: federation.inviteCode,
        message: 'preview failed',
      }),
    ).toBe(previewingState)
  })

  it('models preview and join steps without impossible preview states', () => {
    const previewState = {
      type: 'preview',
      inviteCode: federation.inviteCode,
      federation,
    } satisfies AddFederationState
    const joiningState = startJoin(previewState)

    expect(getAddFederationStep(previewState)).toBe('preview')
    expect(getAddFederationPreview(previewState)).toBe(federation)
    expect(isAddFederationSubmitting(joiningState)).toBe(true)
    expect(resolveJoinFailure(joiningState)).toEqual(previewState)
    expect(returnToInviteStep(previewState)).toEqual({
      type: 'invite',
      inviteCode: federation.inviteCode,
    })
  })
})
