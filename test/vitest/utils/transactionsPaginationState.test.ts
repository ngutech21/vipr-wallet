import { describe, expect, it } from 'vitest'
import type { OperationKey, Transactions } from '@fedimint/core'
import {
  appendTransactionsPage,
  applyInitialPage,
  createInitialTransactionsState,
  failInitialLoad,
  finishLoadMore,
  startInitialLoad,
  startLoadMore,
  type TransactionsPaginationState,
} from 'src/utils/transactionsPaginationState'

function createOperationKey(operationId: string): OperationKey {
  return {
    operation_id: operationId,
    creation_time: {
      secs_since_epoch: 1_234_567_890,
      nanos_since_epoch: 0,
    },
  }
}

function createTransaction(operationId: string): Transactions {
  return {
    kind: 'mint',
    operationId,
    type: 'receive',
    amountMsats: 1_000,
    timestamp: 1_234_567_890_000,
  } as unknown as Transactions
}

describe('transactions pagination state', () => {
  it('creates a closed empty idle state', () => {
    expect(createInitialTransactionsState()).toEqual({
      transactions: [],
      nextCursor: null,
      hasMore: false,
      phase: 'idle',
      requestId: 0,
    })
  })

  it('starts initial loads by invalidating older async requests', () => {
    const state = {
      ...createInitialTransactionsState(),
      transactions: [createTransaction('old-op')],
      hasMore: true,
      nextCursor: createOperationKey('old-op'),
    }

    expect(startInitialLoad(state)).toEqual({
      ...state,
      phase: 'initial-loading',
      requestId: 1,
    })
  })

  it('applies an initial page as the complete pagination snapshot', () => {
    const state = startInitialLoad(createInitialTransactionsState())
    const nextCursor = createOperationKey('page-op')
    const pageTransactions = [createTransaction('page-op')]

    expect(
      applyInitialPage(state, {
        transactions: pageTransactions,
        nextCursor,
        hasMore: true,
      }),
    ).toEqual({
      transactions: pageTransactions,
      nextCursor,
      hasMore: true,
      phase: 'idle',
      requestId: 1,
    })
  })

  it('clears stale pagination data after an initial load failure', () => {
    const state = {
      transactions: [createTransaction('old-op')],
      nextCursor: createOperationKey('old-op'),
      hasMore: true,
      phase: 'initial-loading',
      requestId: 3,
    } satisfies TransactionsPaginationState

    expect(failInitialLoad(state)).toEqual({
      transactions: [],
      nextCursor: null,
      hasMore: false,
      phase: 'idle',
      requestId: 3,
    })
  })

  it('starts load more only from an idle state with a cursor', () => {
    const state = {
      transactions: [createTransaction('existing-op')],
      nextCursor: createOperationKey('existing-op'),
      hasMore: true,
      phase: 'idle',
      requestId: 2,
    } satisfies TransactionsPaginationState

    expect(startLoadMore(state)).toEqual({
      ...state,
      phase: 'loading-more',
    })

    const initialLoadingState = {
      ...state,
      phase: 'initial-loading',
    } satisfies TransactionsPaginationState
    const completeState = { ...state, hasMore: false } satisfies TransactionsPaginationState
    const exhaustedState = { ...state, nextCursor: null } satisfies TransactionsPaginationState

    expect(startLoadMore(initialLoadingState)).toBe(initialLoadingState)
    expect(startLoadMore(completeState)).toBe(completeState)
    expect(startLoadMore(exhaustedState)).toBe(exhaustedState)
  })

  it('appends later pages without changing the active request generation', () => {
    const existingTransaction = createTransaction('existing-op')
    const pageTransaction = createTransaction('page-op')
    const state = {
      transactions: [existingTransaction],
      nextCursor: createOperationKey('existing-op'),
      hasMore: true,
      phase: 'loading-more',
      requestId: 2,
    } satisfies TransactionsPaginationState

    expect(
      appendTransactionsPage(state, {
        transactions: [pageTransaction],
        nextCursor: null,
        hasMore: false,
      }),
    ).toEqual({
      transactions: [existingTransaction, pageTransaction],
      nextCursor: null,
      hasMore: false,
      phase: 'idle',
      requestId: 2,
    })
  })

  it('finishes a failed load more without dropping already loaded rows', () => {
    const transaction = createTransaction('existing-op')
    const state = {
      transactions: [transaction],
      nextCursor: createOperationKey('existing-op'),
      hasMore: true,
      phase: 'loading-more',
      requestId: 4,
    } satisfies TransactionsPaginationState

    expect(finishLoadMore(state)).toEqual({
      ...state,
      phase: 'idle',
    })
  })
})
