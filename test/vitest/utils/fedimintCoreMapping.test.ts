import { describe, expect, it } from 'vitest'

import { FedimintWallet } from '@fedimint/core/testing'

describe('fedimint core wallet transaction mapping', () => {
  it('currently drops wallet deposit amounts when mapping listTransactions', async () => {
    const operationKey = {
      creation_time: {
        secs_since_epoch: 1,
        nanos_since_epoch: 0,
      },
      operation_id: 'deposit-operation-id',
    }

    const operationLog = {
      operation_module_kind: 'wallet',
      meta: {
        amount: 210_000_000,
        extra_meta: {},
        variant: {
          deposit: {
            address: 'bcrt1qexampledepositaddress0000000000000000000000000',
            tweak_idx: 1,
          },
        },
      },
      outcome: null,
    }

    const calls: unknown[][] = []
    const client = {
      rpcSingle: (...args: unknown[]) => {
        calls.push(args)
        return Promise.resolve([[operationKey, operationLog]])
      },
    }

    const wallet = new FedimintWallet(client as never, 'vipr-wallet-test')
    const transactions = await wallet.federation.listTransactions()

    expect(calls).toEqual([
      ['', 'list_operations', { limit: null, last_seen: null }, 'vipr-wallet-test'],
    ])
    expect(transactions).toHaveLength(1)
    expect(transactions[0]).toMatchObject({
      operationId: 'deposit-operation-id',
      kind: 'wallet',
      type: 'deposit',
      onchainAddress: 'bcrt1qexampledepositaddress0000000000000000000000000',
      amountMsats: 0,
      fee: 0,
    })
  })
})
