import type { LightningTransaction } from '@fedimint/core'

export function getLightningTransactionAmountSats(
  transaction: LightningTransaction,
): number | null {
  const amountMsats = (transaction as LightningTransaction & { amountMsats?: unknown }).amountMsats
  return typeof amountMsats === 'number' && Number.isFinite(amountMsats) && amountMsats > 0
    ? Math.floor(amountMsats / 1_000)
    : null
}
