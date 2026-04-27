import { describe, expect, it } from 'vitest'
import { classifyScannedPayment } from 'src/utils/scannedPayment'

describe('classifyScannedPayment', () => {
  it('classifies federation invite codes', () => {
    expect(classifyScannedPayment(' fed1abc ')).toEqual({
      type: 'add-federation',
      inviteCode: 'fed1abc',
    })
  })

  it('classifies bitcoin URIs as onchain targets', () => {
    const target = 'bitcoin:bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080?amount=0.00021&label=Vipr'

    expect(classifyScannedPayment(target)).toEqual({
      type: 'send-onchain',
      target,
    })
  })

  it('keeps bitcoin URIs onchain even when query params contain an at sign', () => {
    const target =
      'bitcoin:bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080?amount=0.00021&label=alice@example.com'

    expect(classifyScannedPayment(target)).toEqual({
      type: 'send-onchain',
      target,
    })
  })

  it('asks for a payment method when a bitcoin URI includes a lightning invoice', () => {
    const bitcoinUri =
      'bitcoin:BC1QYLH3U67J673H6Y6ALV70M0PL2YZ53TZHVXGG7U?amount=0.00001&label=Lunch&lightning=LNBC10U1P3PJ257'

    expect(classifyScannedPayment(bitcoinUri)).toEqual({
      type: 'choose-bip21-payment',
      bitcoinUri,
      onchain: {
        address: 'BC1QYLH3U67J673H6Y6ALV70M0PL2YZ53TZHVXGG7U',
        amountSats: 1_000,
        label: 'Lunch',
        lightning: 'LNBC10U1P3PJ257',
      },
      lightningInvoice: 'LNBC10U1P3PJ257',
    })
  })

  it('classifies raw bitcoin addresses as onchain targets without lowercasing', () => {
    expect(classifyScannedPayment('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy')).toEqual({
      type: 'send-onchain',
      target: '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
    })
  })

  it('classifies lightning invoices and strips the lightning URI prefix', () => {
    expect(classifyScannedPayment('lightning:lnbc123')).toEqual({
      type: 'send-lightning',
      invoice: 'lnbc123',
    })
  })

  it('classifies lightning addresses case-insensitively', () => {
    expect(classifyScannedPayment('User@Example.com')).toEqual({
      type: 'send-lightning',
      invoice: 'user@example.com',
    })
  })

  it('falls back to ecash redemption for unknown scan values', () => {
    expect(classifyScannedPayment(' cashuAexample ')).toEqual({
      type: 'receive-ecash',
      token: 'cashuAexample',
    })
  })
})
