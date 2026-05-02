import { describe, expect, it } from 'vitest'
import {
  normalizeFederationMetadata,
  resolveFederationMetadata,
} from 'src/services/federation-metadata'

describe('federation metadata resolver', () => {
  it('lets meta module values override config and legacy metadata', () => {
    const metadata = resolveFederationMetadata({
      config: {
        federation_name: 'Config Federation',
      },
      legacy: {
        federation_name: 'Legacy Federation',
        federation_icon_url: 'https://legacy.example/icon.png',
        max_invoice_msats: '50000',
      },
      metaModule: {
        revision: 2,
        value: {
          federation_name: 'Meta Federation',
          'fedi:federation_icon_url': 'https://meta.example/icon.png',
          'fedi:max_invoice_msats': 75_000,
        },
      },
    })

    expect(metadata.federationName).toBe('Meta Federation')
    expect(metadata.iconUrl).toBe('https://meta.example/icon.png')
    expect(metadata.maxInvoiceMsats).toBe(75_000)
  })

  it('maps legacy and fedi namespaced keys to the same app fields', () => {
    const metadata = resolveFederationMetadata({
      legacy: {
        default_currency: 'USD',
        tos_url: 'https://legacy.example/terms',
        public: 'true',
      },
      metaModule: {
        'fedi:default_currency': 'EUR',
        'fedi:tos_url': 'https://meta.example/terms',
        'fedi:popup_countdown_message': 'Ends soon',
        'fedi:popup_end_timestamp': '1893456000',
        vetted_gateways: ['gateway-a', 'gateway-b'],
        recurringd_api: 'https://recurring.example/api',
        lnaddress_api: 'https://lnaddress.example/api',
      },
    })

    expect(metadata.defaultCurrency).toBe('EUR')
    expect(metadata.tosUrl).toBe('https://meta.example/terms')
    expect(metadata.isPublic).toBe(true)
    expect(metadata.popupCountdownMessage).toBe('Ends soon')
    expect(metadata.popupEndTimestamp).toBe(1_893_456_000)
    expect(metadata.vettedGateways).toEqual(['gateway-a', 'gateway-b'])
    expect(metadata.recurringdApi).toBe('https://recurring.example/api')
    expect(metadata.lnaddressApi).toBe('https://lnaddress.example/api')
  })

  it('does not expose unused legacy fields on the app metadata type', () => {
    const metadata = resolveFederationMetadata({
      legacy: {
        chat_server_domain: 'chat.example.com',
        onchain_deposits_disabled: true,
        stability_pool_disabled: true,
      },
    })

    expect(metadata).toEqual({})
  })

  it('ignores invalid typed values', () => {
    const metadata = resolveFederationMetadata({
      legacy: {
        federation_icon_url: 'not a url',
        max_balance_msats: '-1',
        max_invoice_msats: 'not a number',
        popup_end_timestamp: 0,
        tos_url: 'ftp://example.com/terms',
      },
    })

    expect(metadata).toEqual({})
  })

  it('normalizes old stored metadata shapes', () => {
    const metadata = normalizeFederationMetadata({
      federation_icon_url: 'https://legacy.example/icon.png',
      welcome_message: 'Welcome',
      invite_code: 'fed11invite',
      popup_countdown_message: 'Migrating soon',
      popup_end_timestamp: '1893456000',
    })

    expect(metadata).toMatchObject({
      iconUrl: 'https://legacy.example/icon.png',
      welcomeMessage: 'Welcome',
      inviteCode: 'fed11invite',
      popupCountdownMessage: 'Migrating soon',
      popupEndTimestamp: 1_893_456_000,
    })
  })

  it('does not recursively capture existing raw sources as legacy metadata', () => {
    const metadata = resolveFederationMetadata({
      legacy: {
        welcomeMessage: 'Welcome',
        rawSources: {
          legacy: {
            welcome_message: 'Welcome',
          },
        },
      },
      includeRawSources: true,
    })

    expect(metadata.rawSources?.legacy).toEqual({
      welcomeMessage: 'Welcome',
    })
  })

  it('keeps stored raw sources idempotent when normalizing repeatedly', () => {
    const metadata = resolveFederationMetadata({
      legacy: {
        welcome_message: 'Welcome',
      },
      includeRawSources: true,
    })

    const normalizedOnce = normalizeFederationMetadata(metadata)
    const normalizedTwice = normalizeFederationMetadata(normalizedOnce)

    expect(normalizedOnce.rawSources).toEqual({
      legacy: {
        welcome_message: 'Welcome',
      },
    })
    expect(normalizedTwice).toEqual(normalizedOnce)
    expect(JSON.stringify(normalizedTwice.rawSources)).not.toContain('rawSources')
  })
})
