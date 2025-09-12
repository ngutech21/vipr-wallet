import { consola } from 'consola'
import type { ConsolaInstance } from 'consola'

/**
 * Security-conscious logger for the Vipr wallet application.
 * Ensures sensitive data is never logged in production.
 */
class WalletLogger {
  private logger: ConsolaInstance
  private isProd = import.meta.env.PROD
  private isDev = import.meta.env.DEV

  // Domain-specific loggers with tags
  wallet: ConsolaInstance
  transaction: ConsolaInstance
  federation: ConsolaInstance
  lightning: ConsolaInstance
  nostr: ConsolaInstance
  scanner: ConsolaInstance
  pwa: ConsolaInstance
  ui: ConsolaInstance

  /**
   * Get log level based on environment
   * Levels: 0=silent, 1=error, 2=warn, 3=info, 4=debug, 5=trace
   */
  private getLogLevel(): number {
    // Check for explicit log level in environment variable
    if (import.meta.env.VITE_LOG_LEVEL != null && import.meta.env.VITE_LOG_LEVEL !== '') {
      const levels: Record<string, number> = {
        silent: 0,
        error: 1,
        warn: 2,
        info: 3,
        debug: 4,
        trace: 5,
      }
      return levels[import.meta.env.VITE_LOG_LEVEL] ?? (this.isProd ? 1 : 4)
    }

    // Default: errors only in production, verbose in development
    return this.isProd ? 1 : 4
  }

  constructor() {
    // Allow override via environment variable or default to prod/dev detection
    const logLevel = this.getLogLevel()

    this.logger = consola.create({
      level: logLevel,
      formatOptions: {
        date: true,
        colors: true,
        compact: this.isProd,
      },
    })

    // Initialize domain-specific loggers
    this.wallet = this.logger.withTag('wallet')
    this.transaction = this.logger.withTag('tx')
    this.federation = this.logger.withTag('fed')
    this.lightning = this.logger.withTag('ln')
    this.nostr = this.logger.withTag('nostr')
    this.scanner = this.logger.withTag('scan')
    this.pwa = this.logger.withTag('pwa')
    this.ui = this.logger.withTag('ui')
  }

  /**
   * Log wallet operations without exposing sensitive data in production
   */
  logWalletOperation(operation: string, data?: { federationId?: string; [key: string]: unknown }) {
    if (this.isProd) {
      // Never log federation IDs or wallet data in production
      this.wallet.info(operation)
    } else {
      this.wallet.debug(operation, data)
    }
  }

  /**
   * Log transactions without exposing payment details in production
   */
  logTransaction(
    action: string,
    data?: { invoice?: string; amount?: number; [key: string]: unknown },
  ) {
    if (this.isProd) {
      // Never log invoices, amounts, or payment details in production
      this.transaction.info(action)
    } else {
      // In dev, log but truncate sensitive strings
      const sanitized =
        data != null
          ? {
              ...data,
              invoice:
                data.invoice != null && data.invoice !== ''
                  ? `${data.invoice.substring(0, 20)}...`
                  : undefined,
            }
          : undefined
      this.transaction.debug(action, sanitized)
    }
  }

  /**
   * Log federation operations
   */
  logFederation(action: string, federationId?: string, metadata?: unknown) {
    if (this.isProd) {
      this.federation.info(action)
    } else {
      this.federation.debug(action, { federationId, metadata })
    }
  }

  /**
   * Log lightning operations
   */
  logLightning(action: string, data?: unknown) {
    if (this.isProd) {
      this.lightning.info(action)
    } else {
      this.lightning.debug(action, data)
    }
  }

  /**
   * Log errors with context for tracking
   */
  error(message: string, error?: unknown) {
    // Convert unknown errors to Error instances for better logging
    const errorObj =
      error instanceof Error
        ? error
        : error != null
          ? new Error(typeof error === 'string' ? error : JSON.stringify(error))
          : undefined
    this.logger.error(message, errorObj)

    if (this.isProd && errorObj != null) {
      // In production, send to error tracking service (e.g., Sentry)
      // this.sendToErrorTracking(errorObj)
    }
  }

  /**
   * Log warnings
   */
  warn(message: string, data?: unknown) {
    if (this.isProd) {
      this.logger.warn(message)
    } else {
      this.logger.warn(message, data)
    }
  }

  /**
   * Debug logging (dev only)
   */
  debug(message: string, data?: unknown) {
    if (this.isDev) {
      this.logger.debug(message, data)
    }
  }

  /**
   * Info logging
   */
  info(message: string, data?: unknown) {
    if (this.isProd) {
      this.logger.info(message)
    } else {
      this.logger.info(message, data)
    }
  }

  /**
   * Success logging
   */
  success(message: string, data?: unknown) {
    if (this.isProd) {
      this.logger.success(message)
    } else {
      this.logger.success(message, data)
    }
  }

  /**
   * Create a child logger with a specific tag
   */
  withTag(tag: string) {
    return this.logger.withTag(tag)
  }
}

// Export singleton instance
export const logger = new WalletLogger()
