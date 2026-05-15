import type { Federation } from 'src/types/federation'

export type AddFederationStep = 'invite' | 'preview'

export type AddFederationState =
  | {
      type: 'invite'
      inviteCode: string
    }
  | {
      type: 'previewing'
      inviteCode: string
      requestId: number
    }
  | {
      type: 'preview'
      inviteCode: string
      federation: Federation
    }
  | {
      type: 'joining'
      inviteCode: string
      federation: Federation
    }
  | {
      type: 'error'
      inviteCode: string
      message: string
    }

export function resolveInitialAddFederationState({
  initialInviteCode,
  initialPreviewFederation,
}: {
  initialInviteCode?: string | null | undefined
  initialPreviewFederation?: Federation | null | undefined
}): AddFederationState {
  const inviteCode = initialInviteCode ?? initialPreviewFederation?.inviteCode ?? ''

  if (initialPreviewFederation != null) {
    return {
      type: 'preview',
      inviteCode,
      federation: initialPreviewFederation,
    }
  }

  return {
    type: 'invite',
    inviteCode,
  }
}

export function updateInviteCode(
  _state: AddFederationState,
  value: string | number | null,
): AddFederationState {
  return {
    type: 'invite',
    inviteCode: typeof value === 'string' ? value : '',
  }
}

export function startPreview(state: AddFederationState, requestId: number): AddFederationState {
  const inviteCode = state.inviteCode.trim()
  if (inviteCode === '') {
    return state
  }

  return {
    type: 'previewing',
    inviteCode,
    requestId,
  }
}

export function resolvePreviewSuccess(
  state: AddFederationState,
  {
    requestId,
    inviteCode,
    federation,
  }: {
    requestId: number
    inviteCode: string
    federation: Federation | null | undefined
  },
): AddFederationState {
  if (!isCurrentPreviewRequest(state, requestId, inviteCode)) {
    return state
  }

  if (federation == null) {
    return {
      type: 'invite',
      inviteCode,
    }
  }

  return {
    type: 'preview',
    inviteCode,
    federation,
  }
}

export function resolvePreviewFailure(
  state: AddFederationState,
  {
    requestId,
    inviteCode,
    message,
  }: {
    requestId: number
    inviteCode: string
    message: string
  },
): AddFederationState {
  if (!isCurrentPreviewRequest(state, requestId, inviteCode)) {
    return state
  }

  return {
    type: 'error',
    inviteCode,
    message,
  }
}

export function returnToInviteStep(state: AddFederationState): AddFederationState {
  return {
    type: 'invite',
    inviteCode: state.inviteCode,
  }
}

export function startJoin(state: AddFederationState): AddFederationState {
  if (state.type !== 'preview') {
    return state
  }

  return {
    type: 'joining',
    inviteCode: state.inviteCode,
    federation: state.federation,
  }
}

export function resolveJoinFailure(state: AddFederationState): AddFederationState {
  if (state.type !== 'joining') {
    return state
  }

  return {
    type: 'preview',
    inviteCode: state.inviteCode,
    federation: state.federation,
  }
}

export function getAddFederationStep(state: AddFederationState): AddFederationStep {
  return state.type === 'preview' || state.type === 'joining' ? 'preview' : 'invite'
}

export function getAddFederationPreview(state: AddFederationState): Federation | null {
  return state.type === 'preview' || state.type === 'joining' ? state.federation : null
}

export function isAddFederationSubmitting(state: AddFederationState): boolean {
  return state.type === 'previewing' || state.type === 'joining'
}

function isCurrentPreviewRequest(
  state: AddFederationState,
  requestId: number,
  inviteCode: string,
): boolean {
  return (
    state.type === 'previewing' &&
    state.requestId === requestId &&
    state.inviteCode.trim() === inviteCode.trim()
  )
}
