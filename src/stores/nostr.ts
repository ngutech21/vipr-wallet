import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import type { NDKEvent, NDKFilter, NDKSubscription } from '@nostr-dev-kit/ndk'
import NDK from '@nostr-dev-kit/ndk'
import type { Federation } from 'src/components/models'
import { Nip87Kinds } from 'src/types/nip87'
import { useWalletStore } from './wallet'
import { logger } from 'src/services/logger'

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
    isDiscoveringFederations: false,
    federationSubscription: null as NDKSubscription | null,
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
        this.ndk?.connect().catch(() => {
          // Connection errors are handled by the race condition below
        })

        // Wait for either timeout or connection
        await Promise.race([
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Connection timeout')), 10000)
          }),
          connectionPromise,
        ])

        logger.nostr.debug('NDK initialized', { relayUrls: this.ndk.explicitRelayUrls })

        // Give time for more relays to connect
        await new Promise((resolve) => { setTimeout(resolve, 1000) })
      } catch (error) {
        logger.error('Failed to initialize NDK', error)
      }
    },

    async discoverFederations() {
      if (this.ndk === null) {
        await this.initNdk()
      }
      this.isDiscoveringFederations = true

      const mintInfoFilter: NDKFilter = {
        kinds: [Nip87Kinds.FediInfo],
      } as unknown as NDKFilter

      if (this.ndk) {
        this.federationSubscription = this.ndk.subscribe(mintInfoFilter, { closeOnEose: false })

        // Process event synchronously, but handle async operations properly
        this.federationSubscription?.on('event', (event) => {
          processFederationEvent(this.discoveredFederations, this, event).catch((error) => {
            logger.error('Failed to process federation event', error)
          })
        })
      }
    },

    stopDiscoveringFederations() {
      logger.nostr.debug('Stopping federation discovery')
      if (this.federationSubscription) {
        this.federationSubscription.stop()
        this.federationSubscription = null
      }
      this.isDiscoveringFederations = false
    },
  },
})

async function processFederationEvent(
  discoveredFederations: Federation[],
  store: ReturnType<typeof useNostrStore>,
  event: NDKEvent,
) {
  if (event.kind !== Nip87Kinds.FediInfo) return

  try {
    logger.nostr.debug('Processing federation event', {
      eventId: event.id,
      createdAt: event.created_at,
    })
    // Get invite code
    const inviteTags = event.getMatchingTags('u')
    const inviteCode = inviteTags[0]?.[1]
    if (!inviteCode) return

    // Get federation ID
    const fedTags = event.getMatchingTags('d')
    const federationId = fedTags[0]?.[1]
    if (!federationId) return

    if (discoveredFederations.some((f) => f.federationId === federationId)) {
      logger.nostr.debug('Federation already discovered', { federationId })
      return
    }

    const federation = await walletStore.previewFederation(inviteCode)
    if (federation === undefined) {
      logger.error('Failed to preview federation', { federationId })
      return
    }

    if (!discoveredFederations.some((f) => f.federationId === federation.federationId)) {
      discoveredFederations.push(federation)
      discoveredFederations.sort((a, b) => {
        return (a.title || '').localeCompare(b.title || '')
      })
    }

    store.isDiscoveringFederations = false
  } catch (error) {
    logger.error('Error processing federation event', { eventId: event.id, error })
  }
}
