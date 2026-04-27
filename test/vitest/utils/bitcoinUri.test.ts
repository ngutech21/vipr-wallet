import { describe, expect, it } from 'vitest'
import {
  isBitcoinAddress,
  parseBitcoinAmountToSats,
  parseBitcoinInput,
  parseBitcoinUri,
} from 'src/utils/bitcoinUri'

describe('bitcoinUri utils', () => {
  it('parses bitcoin URIs with amount, label, and message', () => {
    expect(
      parseBitcoinUri(
        'bitcoin:bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080?amount=0.00021&label=Vipr&message=Top%20up',
      ),
    ).toEqual({
      address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080',
      amountSats: 21_000,
      label: 'Vipr',
      message: 'Top up',
    })
  })

  it('parses bitcoin URIs with a lightning fallback invoice', () => {
    expect(
      parseBitcoinUri(
        'bitcoin:bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080?amount=0.00001&lightning=LNBC10U1P3PJ257',
      ),
    ).toEqual({
      address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080',
      amountSats: 1_000,
      lightning: 'LNBC10U1P3PJ257',
    })
  })

  it('accepts raw bitcoin addresses as payment input', () => {
    expect(parseBitcoinInput('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy')).toEqual({
      address: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
    })
  })

  it('rejects malformed bitcoin URI amounts', () => {
    expect(() =>
      parseBitcoinUri('bitcoin:bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080?amount=0.123456789'),
    ).toThrow('Bitcoin URI amount must be a BTC value with up to 8 decimals')
  })

  it('converts BTC amounts to sats without floating point drift', () => {
    expect(parseBitcoinAmountToSats('1.00000001')).toBe(100_000_001)
  })

  it('recognizes bech32 and base58 bitcoin addresses', () => {
    expect(isBitcoinAddress('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080')).toBe(true)
    expect(isBitcoinAddress('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy')).toBe(true)
    expect(isBitcoinAddress('vipr-not-a-bitcoin-address')).toBe(false)
  })
})
