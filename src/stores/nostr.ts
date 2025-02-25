import { defineStore } from 'pinia'

import type { NDKEvent, NDKFilter } from '@nostr-dev-kit/ndk'
import NDK from '@nostr-dev-kit/ndk'
import { Nip87Kinds } from 'src/types/nip87'
import type { Federation } from 'src/components/models'

export const useNostrStore = defineStore('nostr', {
  state: () => ({
    ndk: null as NDK | null,
    discoveredFederations: [] as Federation[],
  }),

  getters: {},
  actions: {
    async initNdk() {
      try {
        this.ndk = new NDK({
          explicitRelayUrls: [
            'wss://nostr.mutinywallet.com/',
            'wss://relay.damus.io',
            'wss://nos.lol',
            'wss://relay.nostr.band',
            'wss://relay.snort.social',
            'wss://relay.primal.net',
          ],
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
    const meta = await getMetaData(federation.inviteCode)
    console.log('Federation metadata:', meta)
    federation.title = meta.federation_name
    federation.icon_url = meta.federation_icon_url

    // Skip expired federations
    const currentTime = Math.floor(Date.now() / 1000)
    if (meta.federation_expiry_timestamp && meta.federation_expiry_timestamp < currentTime) {
      console.log(`Skipping expired federation: ${federation.federationId}`)
      return
    }

    // Add if not exists
    const exists = discoveredFederations.some((f) => f.federationId === federation.federationId)
    if (!exists) {
      discoveredFederations.push(federation)
      discoveredFederations.sort((a, b) => {
        return (a.title || '').localeCompare(b.title || '')
      })
    }
  } catch (error) {
    console.error('Error processing federation:', error)
  }
}

async function getMetaData(inviteCode: string) {
  const metaResponse = await fetch(`https://fmo.sirion.io/config/${inviteCode}/meta`)
  return await metaResponse.json()
}
