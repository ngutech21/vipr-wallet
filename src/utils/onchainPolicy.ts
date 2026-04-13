export const MIN_ONCHAIN_SEND_SATS = 1_000
export const ONCHAIN_FEE_RESERVE_SATS = 2_000

export function getMaxOnchainSendAmount(balanceSats: number): number {
  const normalizedBalance = Math.max(0, Math.floor(balanceSats))
  return Math.max(0, normalizedBalance - ONCHAIN_FEE_RESERVE_SATS)
}
