import { defineStore } from 'pinia'
import { openDB } from 'idb'
import type { LightningTransaction } from 'src/components/models'
import { v4 as uuidv4 } from 'uuid'

const dbPromise = openDB('lightning-transactions-db', 1, {
  upgrade(db) {
    db.createObjectStore('transactions', { keyPath: 'id' })
  },
})

export const useLightningTransactionsStore = defineStore('lightningTransactions', {
  state: () => ({
    transactions: [] as LightningTransaction[],
  }),
  actions: {
    async addTransaction(transaction: LightningTransaction) {
      if (!transaction.id) {
        transaction.id = uuidv4()
      }
      this.transactions.push(transaction)
      const db = await dbPromise
      await db.put('transactions', transaction)
    },
    async loadTransactions() {
      const db = await dbPromise
      this.transactions = await db.getAll('transactions')
    },
  },
})
