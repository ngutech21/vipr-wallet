import { defineStore } from 'pinia'
import type { Federation } from 'src/components/models'
import { useWalletStore } from './wallet'

// Helper to open (or create) the IndexedDB database
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('federations', 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('federations')) {
        db.createObjectStore('federations', { keyPath: 'federationId' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error(request.error?.message || 'Unknown error'))
  })
}

export const useFederationStore = defineStore('federation', {
  state: () => ({
    federations: [] as Federation[],
    selectedFederation: null as Federation | null,
  }),
  actions: {
    async addFederation(newFedi: Federation) {
      const db = await openDB()
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction('federations', 'readwrite')
        const store = tx.objectStore('federations')
        const request = store.add(newFedi)
        request.onsuccess = () => {
          this.federations.push(newFedi)
          resolve()
        }
        request.onerror = () => reject(new Error(request.error?.message || 'Unknown error'))
      })
    },
    async deleteFederation(federationId: string) {
      const db = await openDB()
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction('federations', 'readwrite')
        const store = tx.objectStore('federations')
        const request = store.delete(federationId)
        request.onsuccess = () => {
          this.federations = this.federations.filter((f) => f.federationId !== federationId)
          resolve()
        }
        request.onerror = () => reject(new Error(request.error?.message || 'Unknown error'))
      })
    },
    async loadFederations() {
      const db = await openDB()
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction('federations', 'readonly')
        const store = tx.objectStore('federations')
        const request = store.getAll()
        request.onsuccess = () => {
          this.federations = request.result as Federation[]
          resolve()
        }
        request.onerror = () => reject(new Error(request.error?.message || 'Unknown error'))
      })
    },
    async selectFederation(fedi: Federation) {
      this.selectedFederation = fedi
      localStorage.setItem('selectedFederation', JSON.stringify(fedi))
      const walletStore = useWalletStore()
      await walletStore.openWallet()
    },
    loadSelectedFederation() {
      const storedFedi = localStorage.getItem('selectedFederation')
      if (storedFedi) {
        this.selectedFederation = JSON.parse(storedFedi)
      }
    },
  },
})
