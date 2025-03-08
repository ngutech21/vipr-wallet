import { defineStore } from 'pinia'
import type { IDBPDatabase } from 'idb'
import { openDB } from 'idb'
import { v4 as uuidv4 } from 'uuid'
import type {
  AnyTransaction,
  LightningReceiveTransaction,
  LightningSendTransaction,
} from 'src/components/models'
import { useFederationStore } from './federation'

const DB_NAME = 'viper-transactions'
const DB_LN_RECEIVE = 'lightning-receive'
const DB_LN_SEND = 'lightning-send'
// Database version - increment when schema changes
const DB_VERSION = 1

async function getDatabase() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, _newVersion) {
      // For a new database, oldVersion is 0
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains(DB_LN_RECEIVE)) {
          const receiveStore = db.createObjectStore(DB_LN_RECEIVE, { keyPath: 'id' })
          receiveStore.createIndex('createdAt', 'createdAt')
          receiveStore.createIndex('status', 'status')
          receiveStore.createIndex('federationId', 'federationId')
        }

        if (!db.objectStoreNames.contains(DB_LN_SEND)) {
          const sendStore = db.createObjectStore(DB_LN_SEND, { keyPath: 'id' })
          sendStore.createIndex('createdAt', 'createdAt')
          sendStore.createIndex('status', 'status')
          sendStore.createIndex('federationId', 'federationId')
        }
      }
    },
    blocked() {
      console.warn('Database upgrade was blocked')
    },
    blocking() {
      console.warn('This connection is blocking a database upgrade')
    },
    terminated() {
      console.error('Database connection was terminated unexpectedly')
    },
  })
}
// Replace existing dbPromise with a function
async function withDB<T>(callback: (db: IDBPDatabase<unknown>) => Promise<T>) {
  try {
    const db = await getDatabase()
    return await callback(db)
  } catch (error) {
    console.error('Database operation failed:', error)
    throw error
  }
}

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

    recentTransactionsBySelectedFederation(): AnyTransaction[] {
      const federationStore = useFederationStore()
      if (!federationStore.selectedFederation) {
        return []
      }

      return this.allTransactions
        .filter((tx) => tx.federationId === federationStore.selectedFederation!.federationId)
        .slice(0, 5)
    },
  },

  actions: {
    async addReceiveTransaction(
      tx: Omit<LightningReceiveTransaction, 'id'>,
    ): Promise<LightningReceiveTransaction> {
      const transaction: LightningReceiveTransaction = {
        ...tx,
        id: uuidv4(),
        createdAt: tx.createdAt || new Date(),
      }

      this.receiveTransactions.push(transaction)
      await withDB((db) => db.put(DB_LN_RECEIVE, transaction))
      return transaction
    },

    async addSendTransaction(
      tx: Omit<LightningSendTransaction, 'id'>,
    ): Promise<LightningSendTransaction> {
      const transaction: LightningSendTransaction = {
        ...tx,
        id: uuidv4(),
        createdAt: tx.createdAt || new Date(),
      }

      this.sendTransactions.push(transaction)
      await withDB((db) => db.put(DB_LN_SEND, transaction))
      return transaction
    },

    async loadAllTransactions() {
      try {
        const [receiveTransactions, sendTransactions] = await Promise.all([
          withDB((db) => db.getAll(DB_LN_RECEIVE)),
          withDB((db) => db.getAll(DB_LN_SEND)),
        ])

        this.receiveTransactions = receiveTransactions
        this.sendTransactions = sendTransactions
      } catch (error) {
        console.error('Failed to load transactions:', error)
        this.receiveTransactions = []
        this.sendTransactions = []
      }
    },
    async deleteTransactionsByFederationId(federationId: string) {
      try {
        // First get all transactions to delete
        const [receiveToDelete, sendToDelete] = await Promise.all([
          withDB((db) => db.getAllFromIndex(DB_LN_RECEIVE, 'federationId', federationId)),
          withDB((db) => db.getAllFromIndex(DB_LN_SEND, 'federationId', federationId)),
        ])

        // Delete from database
        await Promise.all([
          ...receiveToDelete.map((tx) => withDB((db) => db.delete(DB_LN_RECEIVE, tx.id))),
          ...sendToDelete.map((tx) => withDB((db) => db.delete(DB_LN_SEND, tx.id))),
        ])

        // Update local state
        this.receiveTransactions = this.receiveTransactions.filter(
          (tx) => tx.federationId !== federationId,
        )
        this.sendTransactions = this.sendTransactions.filter(
          (tx) => tx.federationId !== federationId,
        )

        return {
          deleted: receiveToDelete.length + sendToDelete.length,
        }
      } catch (error) {
        console.error(`Failed to delete transactions for federation ${federationId}:`, error)
        throw error
      }
    },
  },
})
