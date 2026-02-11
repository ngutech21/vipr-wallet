import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    isReady: false,
  }),

  actions: {
    setReady(isReady: boolean) {
      this.isReady = isReady
    },
  },
})

