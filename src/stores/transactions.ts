import { defineStore } from 'pinia'
import { openDB } from 'idb'
import { v4 as uuidv4 } from 'uuid'
import type {
  AnyTransaction,
  LightningReceiveTransaction,
  LightningSendTransaction,
} from 'src/components/models'

const DB_LN_RECEIVE = 'lightning-receive'
const DB_LN_SEND = 'lightning-send'
const dbPromise = openDB('viper-transactions', 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(DB_LN_RECEIVE)) {
      const receiveStore = db.createObjectStore(DB_LN_RECEIVE, { keyPath: 'id' })
      receiveStore.createIndex('createdAt', 'createdAt')
      receiveStore.createIndex('status', 'status')
    }

    if (!db.objectStoreNames.contains(DB_LN_SEND)) {
      const sendStore = db.createObjectStore(DB_LN_SEND, { keyPath: 'id' })
      sendStore.createIndex('createdAt', 'createdAt')
      sendStore.createIndex('status', 'status')
    }
  },
})

export const useTransactionsStore = defineStore('transactions', {
  state: () => ({
    receiveTransactions: [] as LightningReceiveTransaction[],
    sendTransactions: [] as LightningSendTransaction[],
  }),

  getters: {
    allTransactions(): AnyTransaction[] {
      const receives = this.receiveTransactions.map((tx) => ({
        ...tx,
        type: 'receive' as const,
      }))

      const sends = this.sendTransactions.map((tx) => ({
        ...tx,
        type: 'send' as const,
      }))

      return [...receives, ...sends].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    },

    recentTransactions(): AnyTransaction[] {
      return this.allTransactions.slice(0, 5)
    },
  },

  actions: {
    async addReceiveTransaction(tx: Omit<LightningReceiveTransaction, 'id'>) {
      const transaction: LightningReceiveTransaction = {
        ...tx,
        id: uuidv4(),
        createdAt: tx.createdAt || new Date(),
      }

      this.receiveTransactions.push(transaction)
      const db = await dbPromise
      await db.put(DB_LN_RECEIVE, transaction)
      return transaction
    },

    async addSendTransaction(tx: Omit<LightningSendTransaction, 'id'>) {
      const transaction: LightningSendTransaction = {
        ...tx,
        id: uuidv4(),
        createdAt: tx.createdAt || new Date(),
      }

      this.sendTransactions.push(transaction)
      const db = await dbPromise
      await db.put(DB_LN_SEND, transaction)
      return transaction
    },

    async loadAllTransactions() {
      const db = await dbPromise
      this.receiveTransactions = await db.getAll(DB_LN_RECEIVE)
      this.sendTransactions = await db.getAll(DB_LN_SEND)
    },
  },
})
