import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type consola, type ConsolaInstance } from 'consola'

vi.unmock('src/services/logger')

type LogMock = ReturnType<typeof vi.fn>
type TagName = 'wallet' | 'tx' | 'fed' | 'ln' | 'nostr' | 'scan' | 'pwa' | 'ui'

interface MockConsolaInstance {
  debug: LogMock
  error: LogMock
  info: LogMock
  success: LogMock
  warn: LogMock
  withTag: ReturnType<typeof vi.fn<(tag: string) => ConsolaInstance>>
}

function createTaggedLogger(): MockConsolaInstance {
  return {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    withTag: vi.fn<(tag: string) => ConsolaInstance>(),
  }
}

function createLoggerHarness() {
  const tags: Record<TagName, MockConsolaInstance> = {
    wallet: createTaggedLogger(),
    tx: createTaggedLogger(),
    fed: createTaggedLogger(),
    ln: createTaggedLogger(),
    nostr: createTaggedLogger(),
    scan: createTaggedLogger(),
    pwa: createTaggedLogger(),
    ui: createTaggedLogger(),
  }
  const root = createTaggedLogger()
  root.withTag.mockImplementation(
    (tag: string) => (tags[tag as TagName] ?? createTaggedLogger()) as unknown as ConsolaInstance,
  )
  const create = vi.fn(() => root as unknown as ConsolaInstance)

  return {
    consola: {
      create,
    } as unknown as Pick<typeof consola, 'create'>,
    root,
    tags,
  }
}

describe('WalletLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('omits transaction metadata in production logs', async () => {
    const { WalletLogger } = await import('src/services/logger')
    const harness = createLoggerHarness()
    const logger = new WalletLogger({
      isProd: true,
      isDev: false,
      logLevel: 1,
      consola: harness.consola,
    })

    logger.logTransaction('send lightning', {
      invoice: 'lnbc1verysecretpaymentrequest',
      amount: 123,
    })

    expect(harness.tags.tx.info).toHaveBeenCalledWith('send lightning')
    expect(harness.tags.tx.debug).not.toHaveBeenCalled()
  })

  it('truncates invoices in development transaction logs', async () => {
    const { WalletLogger } = await import('src/services/logger')
    const harness = createLoggerHarness()
    const logger = new WalletLogger({
      isProd: false,
      isDev: true,
      logLevel: 4,
      consola: harness.consola,
    })

    logger.logTransaction('decode invoice', {
      invoice: 'lnbc1verysecretpaymentrequest',
      amount: 123,
    })

    expect(harness.tags.tx.debug).toHaveBeenCalledWith('decode invoice', {
      invoice: 'lnbc1verysecretpayme...',
      amount: 123,
    })
  })

  it('does not attach warning details in production', async () => {
    const { WalletLogger } = await import('src/services/logger')
    const harness = createLoggerHarness()
    const logger = new WalletLogger({
      isProd: true,
      isDev: false,
      logLevel: 1,
      consola: harness.consola,
    })

    logger.warn('wallet warning', { federationId: 'fed-secret' })

    expect(harness.root.warn).toHaveBeenCalledWith('wallet warning')
  })

  it('logs debug messages only in development mode', async () => {
    const { WalletLogger } = await import('src/services/logger')
    const productionHarness = createLoggerHarness()
    const devHarness = createLoggerHarness()

    new WalletLogger({
      isProd: true,
      isDev: false,
      logLevel: 1,
      consola: productionHarness.consola,
    }).debug('hidden debug', { value: 1 })
    new WalletLogger({
      isProd: false,
      isDev: true,
      logLevel: 4,
      consola: devHarness.consola,
    }).debug('visible debug', { value: 1 })

    expect(productionHarness.root.debug).not.toHaveBeenCalled()
    expect(devHarness.root.debug).toHaveBeenCalledWith('visible debug', { value: 1 })
  })
})
