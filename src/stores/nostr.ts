import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import type { NDKEvent, NDKFilter } from '@nostr-dev-kit/ndk'
import NDK from '@nostr-dev-kit/ndk'
import type { Federation } from 'src/components/models'
import { Nip87Kinds } from 'src/types/nip87'
import { useWalletStore } from './wallet'

const DEFAULT_RELAYS = [
  'wss://nostr.mutinywallet.com/',
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://relay.snort.social',
  'wss://relay.primal.net',
]

const walletStore = useWalletStore()

export const useNostrStore = defineStore('nostr', {
  state: () => ({
    relays: useLocalStorage<string[]>('vipr.nostr.relays', DEFAULT_RELAYS),
    pubkey: useLocalStorage<string>('vipr.nostr.pubkey', ''),
    ndk: null as NDK | null,
    discoveredFederations: [] as Federation[],
  }),

  getters: {},
  actions: {
    async addRelay(relay: string) {
      if (!this.relays.includes(relay) && relay.startsWith('wss://')) {
        this.relays.push(relay)
        await this.initNdk()
        return true
      }
      return false
    },

    async removeRelay(relay: string) {
      const index = this.relays.indexOf(relay)
      if (index !== -1) {
        this.relays.splice(index, 1)
        await this.initNdk()
        return true
      }
      return false
    },

    async resetRelays() {
      this.relays = [...DEFAULT_RELAYS]
      await this.initNdk()
    },

    setPubkey(pubkey: string) {
      this.pubkey = pubkey
    },

    async initNdk() {
      try {
        this.ndk = new NDK({
          explicitRelayUrls: this.relays,
        })

        // Setup connection promise before connecting
        const connectionPromise = new Promise<void>((resolve) => {
          this.ndk?.pool.on('relay:connect', () => resolve())
        })

        // Start connection
        void this.ndk?.connect()

        // Wait for either timeout or connection
        await Promise.race([
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection timeout')), 10000),
          ),
          connectionPromise,
        ])

        console.log('NDK initialized ', this.ndk.explicitRelayUrls)

        // Give time for more relays to connect
        await new Promise((resolve) => setTimeout(resolve, 1000))
      } catch (error) {
        console.error('Failed to initialize NDK', error)
      }
    },

    async discoverFederations() {
      this.discoveredFederations = []
      if (this.ndk === null) {
        await this.initNdk()
      }

      const mintInfoFilter: NDKFilter = {
        kinds: [Nip87Kinds.FediInfo],
      } as unknown as NDKFilter
      const sub = this.ndk?.subscribe(mintInfoFilter, { closeOnEose: false })

      // Process event synchronously, but handle async operations properly
      sub?.on('event', (event) => {
        void processFederationEvent(this.discoveredFederations, event)
      })
    },
  },
})

async function processFederationEvent(discoveredFederations: Federation[], event: NDKEvent) {
  if (event.kind !== Nip87Kinds.FediInfo) return

  try {
    const federation: Federation = {} as Federation

    // FIXME does not work at the moment. 'd' tag does not contain the network
    // const networks = event.getMatchingTags('d')
    // const network = networks[0]?.[1]
    // if (network) {
    //   federation.network = network
    // }

    // Get invite code
    const inviteTags = event.getMatchingTags('u')
    const inviteCode = inviteTags[0]?.[1]
    if (!inviteCode) return

    federation.inviteCode = inviteCode

    // Get federation ID
    const fedTags = event.getMatchingTags('d')
    const fedId = fedTags[0]?.[1]
    if (!fedId) return

    federation.federationId = fedId

    // Get metadata
    const federationFromInvite = await walletStore.getFederationByInviteCode(federation.inviteCode)
    if (federationFromInvite === undefined) {
      console.error('Failed to fetch metadata for federation:', federation)
      return
    }
    console.log('Federation metadata:', federationFromInvite)
    federation.title = federationFromInvite.title
    federation.icon_url = federationFromInvite.icon_url || ''

    // Add if not exists
    const exists = discoveredFederations.some((f) => f.federationId === federation.federationId)
    if (!exists) {
      discoveredFederations.push(federation)
      discoveredFederations.sort((a, b) => {
        return (a.title || '').localeCompare(b.title || '')
      })
    }
  } catch (error) {
    console.error('Error processing federationEvent:', event, error)
  }
}
