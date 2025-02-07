import { defineStore } from 'pinia'
import type { Federation } from 'src/components/models'

import { useWalletStore } from './wallet' // Import the wallet store

export const useFederationStore = defineStore('federation', {
  state: () => ({
    federations: [
      {
        title: 'Bitcoin Principles',
        inviteCode:
          'fed11qgqzygrhwden5te0v9cxjtnzd96xxmmfdec8y6twvd5hqmr9wvhxuet59upqzg9jzp5vsn6mzt9ylhun70jy85aa0sn7sepdp4fw5tjdeehah0hfmufvlqem',
        federationId: 'b21068c84f5b12ca4fdf93f3e443d3bd7c27e8642d0d52ea2e4dce6fdbbee9df',
      },
      {
        title: 'E-Cash Club',
        inviteCode:
          'fed11qgqpv9rhwden5te0vekjucm5wf3zu6t09amhxtcpqys2ajnveq8lc5ct6t25kztgrahdhxjptsmzujhjlc74upqnwqr05ggd78dhm',
        federationId: 'aeca6cc80ffc530bd2d54b09681f6edb9a415c362e4af2fe3d5e04137006fa21',
      },
    ] as Federation[],
    selectedFederation: null as Federation | null,
  }),
  actions: {
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
