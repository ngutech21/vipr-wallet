import { describe, expect, it } from 'vitest'
import type { WalletDepositState } from '@fedimint/core'
import {
  getCompletedDepositAmount,
  getDepositConfirmationInfo,
  getDepositStatusText,
  normalizeDepositState,
} from 'src/utils/onchainDepositState'

const outPoint = {
  txid: 'txid',
  vout: 0,
}

const waitingForConfirmation = {
  WaitingForConfirmation: {
    btc_deposited: 21_000,
    btc_out_point: outPoint,
  },
} satisfies WalletDepositState

const confirmed = {
  Confirmed: {
    btc_deposited: 42_000,
    btc_out_point: outPoint,
  },
} satisfies WalletDepositState

const claimed = {
  Claimed: {
    btc_deposited: 43_000,
    btc_out_point: outPoint,
  },
} satisfies WalletDepositState

const failed = {
  Failed: 'gateway timeout',
} satisfies WalletDepositState

describe('onchainDepositState', () => {
  it('normalizes valid deposit states from unknown input', () => {
    expect(normalizeDepositState('WaitingForTransaction')).toBe('WaitingForTransaction')
    expect(normalizeDepositState(waitingForConfirmation)).toEqual(waitingForConfirmation)
    expect(normalizeDepositState(confirmed)).toEqual(confirmed)
    expect(normalizeDepositState(claimed)).toEqual(claimed)
    expect(normalizeDepositState(failed)).toEqual(failed)
  })

  it('rejects malformed deposit states', () => {
    expect(normalizeDepositState(null)).toBeNull()
    expect(normalizeDepositState('Confirmed')).toBeNull()
    expect(normalizeDepositState({ Unknown: {} })).toBeNull()
    expect(
      normalizeDepositState({ Confirmed: { btc_deposited: '21000', btc_out_point: outPoint } }),
    ).toBeNull()
    expect(
      normalizeDepositState({
        WaitingForConfirmation: {
          btc_deposited: 21_000,
          btc_out_point: {
            txid: 'txid',
            vout: Number.NaN,
          },
        },
      }),
    ).toBeNull()
  })

  it('maps deposit states to user-facing status text', () => {
    expect(getDepositStatusText(null)).toBe('Waiting for Bitcoin')
    expect(getDepositStatusText('WaitingForTransaction')).toBe('Waiting for Bitcoin')
    expect(getDepositStatusText(waitingForConfirmation)).toBe('Transaction detected')
    expect(getDepositStatusText(confirmed)).toBe('Bitcoin received')
    expect(getDepositStatusText(claimed)).toBe('Bitcoin received')
    expect(getDepositStatusText(failed)).toBe('Deposit failed')
  })

  it('returns confirmation or failure details only when available', () => {
    expect(getDepositConfirmationInfo(null)).toBe('')
    expect(getDepositConfirmationInfo('WaitingForTransaction')).toBe('')
    expect(getDepositConfirmationInfo(waitingForConfirmation)).toBe(
      'Received 21000 sats - confirming...',
    )
    expect(getDepositConfirmationInfo(confirmed)).toBe('')
    expect(getDepositConfirmationInfo(failed)).toBe('gateway timeout')
  })

  it('extracts completed deposit amounts only from terminal success states', () => {
    expect(getCompletedDepositAmount(null)).toBeNull()
    expect(getCompletedDepositAmount('WaitingForTransaction')).toBeNull()
    expect(getCompletedDepositAmount(waitingForConfirmation)).toBeNull()
    expect(getCompletedDepositAmount(failed)).toBeNull()
    expect(getCompletedDepositAmount(confirmed)).toBe(42_000)
    expect(getCompletedDepositAmount(claimed)).toBe(43_000)
  })
})
