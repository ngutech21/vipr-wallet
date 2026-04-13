import { describe, expect, it } from 'vitest'
import {
  getMaxOnchainSendAmount,
  MIN_ONCHAIN_SEND_SATS,
  ONCHAIN_FEE_RESERVE_SATS,
} from 'src/utils/onchainPolicy'

describe('onchainPolicy utils', () => {
  it('keeps a fixed reserve for onchain fees', () => {
    expect(getMaxOnchainSendAmount(10_000)).toBe(10_000 - ONCHAIN_FEE_RESERVE_SATS)
  })

  it('never returns a negative max send amount', () => {
    expect(getMaxOnchainSendAmount(500)).toBe(0)
  })

  it('exports a minimum send amount above dust-level values', () => {
    expect(MIN_ONCHAIN_SEND_SATS).toBeGreaterThan(546)
  })
})
