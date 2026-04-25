import type { WalletTransaction } from '@fedimint/core'

type WalletDepositOutcome = WalletTransaction['outcome'] | 'pending' | undefined

export function getWalletDepositStatusLabel(outcome: WalletDepositOutcome): string {
  switch (outcome) {
    case 'WaitingForConfirmation':
      return 'Transaction detected'
    case 'Confirmed':
    case 'Claimed':
      return 'Bitcoin received'
    case 'Failed':
      return 'Deposit failed'
    case 'pending':
    case 'WaitingForTransaction':
    case undefined:
      return 'Waiting'
    default:
      return 'Waiting'
  }
}

export function getWalletTransactionListTitle(transaction: WalletTransaction): string {
  if (transaction.type === 'withdraw') {
    return 'Sent Bitcoin'
  }

  return 'Received Bitcoin'
}

export function getWalletTransactionDetailTitle(transaction: WalletTransaction): string {
  if (transaction.type === 'withdraw') {
    return 'Sent Bitcoin'
  }

  return 'Received Bitcoin'
}

export function getWalletTransactionStatusLabel(
  transaction: WalletTransaction,
): string | undefined {
  if (transaction.type === 'withdraw') {
    const outcome = transaction.outcome as WalletDepositOutcome

    switch (outcome) {
      case 'Confirmed':
      case 'Claimed':
        return 'Broadcast'
      case 'Failed':
        return 'Failed'
      case 'pending':
      case undefined:
        return 'Processing'
      default:
        return transaction.outcome
    }
  }

  return getWalletDepositStatusLabel(transaction.outcome)
}

export function getWalletTransactionStatusColor(status: string | undefined): string {
  if (status == null || status === '') {
    return 'grey'
  }

  switch (status) {
    case 'Bitcoin received':
    case 'Broadcast':
    case 'Confirmed':
    case 'Claimed':
      return 'positive'
    case 'Processing':
    case 'Received Bitcoin':
    case 'Waiting':
    case 'Transaction detected':
    case 'WaitingForTransaction':
    case 'WaitingForConfirmation':
    case 'pending':
      return 'warning'
    case 'Deposit failed':
    case 'Failed':
      return 'negative'
    default:
      return 'grey'
  }
}

export function getWalletTransactionAmountSats(transaction: WalletTransaction): number | null {
  if (transaction.type === 'withdraw' && transaction.amountMsats <= 0) {
    return null
  }

  return Math.max(0, Math.floor(transaction.amountMsats / 1_000))
}

export function getWalletTransactionFeeSats(transaction: WalletTransaction): number {
  return Math.max(0, Math.floor(transaction.fee / 1_000))
}

export function getWalletTransactionTotalDebitedSats(
  transaction: WalletTransaction,
): number | null {
  if (transaction.type !== 'withdraw') {
    return null
  }

  const amountSats = getWalletTransactionAmountSats(transaction)
  if (amountSats == null) {
    return null
  }

  return amountSats + getWalletTransactionFeeSats(transaction)
}
