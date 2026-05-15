import type { WalletDepositState } from '@fedimint/core'

type DepositPayload = {
  btc_deposited: number
  btc_out_point: {
    txid: string
    vout: number
  }
}

type DepositPayloadKey = 'WaitingForConfirmation' | 'Confirmed' | 'Claimed'

const depositPayloadKeys = ['WaitingForConfirmation', 'Confirmed', 'Claimed'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}

function isDepositPayload(value: unknown): value is DepositPayload {
  return (
    isRecord(value) &&
    typeof value.btc_deposited === 'number' &&
    Number.isFinite(value.btc_deposited) &&
    isRecord(value.btc_out_point) &&
    typeof value.btc_out_point.txid === 'string' &&
    typeof value.btc_out_point.vout === 'number' &&
    Number.isFinite(value.btc_out_point.vout)
  )
}

function getDepositPayloadVariant(
  outcome: Record<string, unknown>,
): { key: DepositPayloadKey; payload: DepositPayload } | null {
  const key = depositPayloadKeys.find((candidate) => isDepositPayload(outcome[candidate]))

  return key == null ? null : { key, payload: outcome[key] as DepositPayload }
}

export function normalizeDepositState(outcome: unknown): WalletDepositState | null {
  if (outcome === 'WaitingForTransaction') {
    return outcome
  }

  if (!isRecord(outcome)) {
    return null
  }

  if (typeof outcome.Failed === 'string') {
    return { Failed: outcome.Failed }
  }

  const variant = getDepositPayloadVariant(outcome)
  if (variant == null) {
    return null
  }

  return { [variant.key]: variant.payload } as WalletDepositState
}

export function getDepositStatusText(state: WalletDepositState | null): string {
  if (state == null || state === 'WaitingForTransaction') {
    return 'Waiting for Bitcoin'
  }

  if ('WaitingForConfirmation' in state) {
    return 'Transaction detected'
  }

  if ('Confirmed' in state || 'Claimed' in state) {
    return 'Bitcoin received'
  }

  if ('Failed' in state) {
    return 'Deposit failed'
  }

  return 'Processing deposit...'
}

export function getDepositConfirmationInfo(state: WalletDepositState | null): string {
  if (state != null && state !== 'WaitingForTransaction' && 'WaitingForConfirmation' in state) {
    return `Received ${state.WaitingForConfirmation.btc_deposited} sats - confirming...`
  }

  if (state != null && state !== 'WaitingForTransaction' && 'Failed' in state) {
    return state.Failed
  }

  return ''
}

export function getCompletedDepositAmount(state: WalletDepositState | null): number | null {
  if (state == null || state === 'WaitingForTransaction') {
    return null
  }

  if ('Confirmed' in state) {
    return state.Confirmed.btc_deposited
  }

  if ('Claimed' in state) {
    return state.Claimed.btc_deposited
  }

  return null
}
