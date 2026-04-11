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
      return 'Waiting for Bitcoin'
    default:
      return 'Waiting for Bitcoin'
  }
}

export function getWalletTransactionListTitle(transaction: WalletTransaction): string {
  if (transaction.type === 'withdraw') {
    return 'Withdrawn'
  }

  return getWalletDepositStatusLabel(transaction.outcome)
}

export function getWalletTransactionDetailTitle(transaction: WalletTransaction): string {
  if (transaction.type === 'withdraw') {
    return 'Withdrawn'
  }

  return 'Bitcoin deposit'
}

export function getWalletTransactionStatusLabel(
  transaction: WalletTransaction,
): string | undefined {
  if (transaction.type === 'withdraw') {
    return transaction.outcome
  }

  return getWalletDepositStatusLabel(transaction.outcome)
}

export function getWalletTransactionStatusColor(status: string | undefined): string {
  if (status == null || status === '') {
    return 'grey'
  }

  switch (status) {
    case 'Bitcoin received':
    case 'Confirmed':
    case 'Claimed':
      return 'positive'
    case 'Waiting for Bitcoin':
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
