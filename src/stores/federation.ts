import { defineStore } from 'pinia'
import type { Federation } from 'src/components/models'

import { useFedimintStore } from './fedimint' // Import the wallet store

export const useFederationStore = defineStore('federation', {
  state: () => ({
    federations: [
      {
        title: 'Odin Federation',
        federationId:
          'fed11qgqzutrhwden5te0vejkg6tdd9h8gepwvejkg6tdd9h8gtn0v35kuen9v3jhyct5d9hkutnc09az7qqpyp938g2xae96wv4jhzg55u4q5tjcw037jsk6948walv95hlyrunm5tyfcdy',
      },
      {
        title: 'School of Sats',
        federationId:
          'fed11qvqpw9thwden5te0v9sjuctnvcczummjvuhhwue0qqqpj9mhwden5te0vekkwvfwv3cxcetz9e5kutmhwvhszqfqax36q0annypfxsxqarfecykxk7tk3ynwq2yxphr8qx46hr9cvn0qmctpcm',
      },
      {
        title: 'freedom one',
        federationId:
          'fed11qgqzz8mhwden5te0vejkg6tdd9h8gepwvchxjmm5w4hxgunp9e3k7mf0qyqjpj2ykt73ullqfj58lxjh67y5ed53zm8vvfjvk5h65ufz3a8v2nxky9wuce',
      },
      {
        title: 'Bitcoin Principles',
        federationId:
          'fed11qgqzygrhwden5te0v9cxjtnzd96xxmmfdec8y6twvd5hqmr9wvhxuet59upqzg9jzp5vsn6mzt9ylhun70jy85aa0sn7sepdp4fw5tjdeehah0hfmufvlqem',
      },
      {
        title: 'E-Cash Club',
        federationId:
          'fed11qgqpv9rhwden5te0vekjucm5wf3zu6t09amhxtcpqys2ajnveq8lc5ct6t25kztgrahdhxjptsmzujhjlc74upqnwqr05ggd78dhm',
      },
    ] as Federation[],
    selectedFederation: null as Federation | null,
  }),
  actions: {
    async selectFederation(fedi: Federation) {
      this.selectedFederation = fedi
      localStorage.setItem('selectedFederation', JSON.stringify(fedi))

      const walletStore = useFedimintStore()

      // FIXME changing wallets does not work yet
      if (!walletStore.wallet?.isOpen()) {
        await walletStore.wallet?.joinFederation(fedi.federationId)
      }
    },
    loadSelectedFederation() {
      const storedFedi = localStorage.getItem('selectedFederation')
      if (storedFedi) {
        this.selectedFederation = JSON.parse(storedFedi)
      }
    },
  },
})
