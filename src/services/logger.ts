// FIXME: Remove linter disable when the code is cleaned up
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { consola, type ConsolaInstance } from 'consola'

// Explicitly type the possible Vite env fields (works in Node + Vite)
interface ViteEnv {
  PROD?: boolean
  DEV?: boolean
  VITE_LOG_LEVEL?: string
}

// Safe extraction without `any`
const viteEnv: ViteEnv = (() => {
  try {
    if (typeof import.meta !== 'undefined' && 'env' in import.meta) {
      return (import.meta as ImportMeta & { env: ViteEnv }).env ?? {}
    }
  } catch {
    /* ignore */
  }
  return {}
})()

const NODE_ENV = process.env.NODE_ENV
const IS_PROD: boolean =
  typeof viteEnv.PROD === 'boolean' ? viteEnv.PROD : NODE_ENV === 'production'
const IS_DEV: boolean = typeof viteEnv.DEV === 'boolean' ? viteEnv.DEV : IS_PROD === false

function resolveLogLevel(): number {
  const raw = String(viteEnv.VITE_LOG_LEVEL ?? process.env.VITE_LOG_LEVEL ?? '').trim()

  if (raw.length > 0) {
    const levels: Record<string, number> = {
      silent: 0,
      error: 1,
      warn: 2,
      info: 3,
      debug: 4,
      trace: 5,
    }

    if (raw in levels) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return levels[raw]!
    }
  }
  return IS_PROD ? 1 : 4
}

/**
 * Security-conscious logger for the Vipr wallet application.
 * Ensures sensitive data is never logged in production.
 */
class WalletLogger {
  private logger: ConsolaInstance
  private readonly isProd: boolean = IS_PROD
  private readonly isDev: boolean = IS_DEV

  wallet: ConsolaInstance
  transaction: ConsolaInstance
  federation: ConsolaInstance
  lightning: ConsolaInstance
  nostr: ConsolaInstance
  scanner: ConsolaInstance
  pwa: ConsolaInstance
  ui: ConsolaInstance

  private getLogLevel(): number {
    return resolveLogLevel()
  }

  constructor() {
    const logLevel = this.getLogLevel()
    this.logger = consola.create({
      level: logLevel,
      formatOptions: {
        date: true,
        colors: true,
        compact: this.isProd,
      },
    })
    this.wallet = this.logger.withTag('wallet')
    this.transaction = this.logger.withTag('tx')
    this.federation = this.logger.withTag('fed')
    this.lightning = this.logger.withTag('ln')
    this.nostr = this.logger.withTag('nostr')
    this.scanner = this.logger.withTag('scan')
    this.pwa = this.logger.withTag('pwa')
    this.ui = this.logger.withTag('ui')
  }

  logWalletOperation(operation: string, data?: { federationId?: string; [k: string]: unknown }) {
    if (this.isProd === true) {
      this.wallet.info(operation)
    } else if (data !== undefined) {
      this.wallet.debug(operation, data)
    } else {
      this.wallet.debug(operation)
    }
  }

  logTransaction(
    action: string,
    data?: { invoice?: string; amount?: number; [k: string]: unknown },
  ) {
    if (this.isProd === true) {
      this.transaction.info(action)
      return
    }
    if (data !== undefined) {
      const sanitized = {
        ...data,
        invoice:
          data.invoice && data.invoice.length > 0
            ? `${data.invoice.substring(0, 20)}...`
            : undefined,
      }
      this.transaction.debug(action, sanitized)
    } else {
      this.transaction.debug(action)
    }
  }

  logFederation(action: string, federationId?: string, metadata?: unknown) {
    if (this.isProd === true) {
      this.federation.info(action)
    } else {
      this.federation.debug(action, { federationId, metadata })
    }
  }

  logLightning(action: string, data?: unknown) {
    if (this.isProd === true) {
      this.lightning.info(action)
    } else if (data !== undefined) {
      this.lightning.debug(action, data)
    } else {
      this.lightning.debug(action)
    }
  }

  error(message: string, error?: unknown) {
    let errorObj: Error | undefined
    if (error instanceof Error) {
      errorObj = error
    } else if (error !== undefined && error !== null) {
      errorObj = typeof error === 'string' ? new Error(error) : new Error(JSON.stringify(error))
    }
    if (errorObj !== undefined) {
      this.logger.error(message, errorObj)
    } else {
      this.logger.error(message)
    }
    if (this.isProd === true && errorObj !== undefined) {
      // hook for external tracking
    }
  }

  warn(message: string, data?: unknown) {
    if (this.isProd === true || data === undefined) {
      this.logger.warn(message)
    } else {
      this.logger.warn(message, data)
    }
  }

  debug(message: string, data?: unknown) {
    if (this.isDev === true) {
      if (data !== undefined) this.logger.debug(message, data)
      else this.logger.debug(message)
    }
  }

  info(message: string, data?: unknown) {
    if (this.isProd === true || data === undefined) {
      this.logger.info(message)
    } else {
      this.logger.info(message, data)
    }
  }

  success(message: string, data?: unknown) {
    if (this.isProd === true || data === undefined) {
      this.logger.success(message)
    } else {
      this.logger.success(message, data)
    }
  }

  withTag(tag: string) {
    return this.logger.withTag(tag)
  }
}

export const logger = new WalletLogger()
