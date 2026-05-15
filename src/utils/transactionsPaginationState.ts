import type { OperationKey, Transactions } from '@fedimint/core'

export type TransactionsPage = {
  transactions: Transactions[]
  nextCursor: OperationKey | null
  hasMore: boolean
}

export type TransactionsPaginationPhase = 'idle' | 'initial-loading' | 'loading-more'

export type TransactionsPaginationState = {
  transactions: Transactions[]
  nextCursor: OperationKey | null
  hasMore: boolean
  phase: TransactionsPaginationPhase
  requestId: number
}

export function createInitialTransactionsState(): TransactionsPaginationState {
  return {
    transactions: [],
    nextCursor: null,
    hasMore: false,
    phase: 'idle',
    requestId: 0,
  }
}

export function startInitialLoad(state: TransactionsPaginationState): TransactionsPaginationState {
  return {
    ...state,
    phase: 'initial-loading',
    requestId: state.requestId + 1,
  }
}

export function applyInitialPage(
  state: TransactionsPaginationState,
  page: TransactionsPage,
): TransactionsPaginationState {
  return {
    ...state,
    transactions: page.transactions,
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
    phase: 'idle',
  }
}

export function failInitialLoad(state: TransactionsPaginationState): TransactionsPaginationState {
  return {
    ...state,
    transactions: [],
    nextCursor: null,
    hasMore: false,
    phase: 'idle',
  }
}

export function startLoadMore(state: TransactionsPaginationState): TransactionsPaginationState {
  if (state.phase !== 'idle' || state.nextCursor == null || !state.hasMore) {
    return state
  }

  return {
    ...state,
    phase: 'loading-more',
  }
}

export function appendTransactionsPage(
  state: TransactionsPaginationState,
  page: TransactionsPage,
): TransactionsPaginationState {
  return {
    ...state,
    transactions: [...state.transactions, ...page.transactions],
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
    phase: 'idle',
  }
}

export function finishLoadMore(state: TransactionsPaginationState): TransactionsPaginationState {
  if (state.phase !== 'loading-more') {
    return state
  }

  return {
    ...state,
    phase: 'idle',
  }
}
