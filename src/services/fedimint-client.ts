import { WalletDirector, type FedimintWallet } from '@fedimint/core'
import { WasmWorkerTransport } from '@fedimint/transport-web'
import { v5 as uuidv5 } from 'uuid'
import { logger } from 'src/services/logger'

type PreviewFederationResponse = {
  config: unknown
  federation_id: string
}

type EnsureWalletOpenArgs = {
  walletName: string
  federationId: string
  inviteCode: string
}

type EnsureMnemonicResult = {
  words: string[]
  created: boolean
}

type FedimintLogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none'

const WALLET_NAME_PREFIX = 'wallet-'
const INVALID_MNEMONIC_RESPONSE_MESSAGE = 'Invalid mnemonic response'
const MNEMONIC_EMPTY_MESSAGE = 'Mnemonic is empty'
const FEDIMINT_CLIENT_NAME_NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8'

class MnemonicExtractionError extends Error {
  constructor(
    public readonly source: 'get' | 'generate' | 'set',
    public readonly shape: string,
    message: string,
  ) {
    super(message)
    this.name = 'MnemonicExtractionError'
  }
}

class FedimintClientAdapter {
  private director: WalletDirector | null = null
  private activeWallet: FedimintWallet | null = null
  private activeWalletName: string | null = null
  private knownWalletNames = new Set<string>()

  async init(): Promise<void> {
    if (this.director != null) {
      return
    }

    this.director = new WalletDirector(new WasmWorkerTransport())
    await this.director.initialize()

    logger.logWalletOperation('Fedimint wallet director initialized')
  }

  setLogLevel(level: FedimintLogLevel): void {
    this.director?.setLogLevel(level)
  }

  async previewFederation(inviteCode: string): Promise<PreviewFederationResponse> {
    await this.init()

    if (this.director == null) {
      throw new Error('Wallet director is not initialized')
    }

    return normalizePreviewResult(await this.director.previewFederation(inviteCode))
  }

  async ensureWalletOpen({
    walletName,
    federationId,
    inviteCode,
  }: EnsureWalletOpenArgs): Promise<FedimintWallet> {
    await this.init()

    if (this.director == null) {
      throw new Error('Wallet director is not initialized')
    }

    if (this.activeWallet != null && this.activeWalletName !== walletName) {
      await this.closeActiveWallet()
    }

    if (this.activeWallet == null) {
      this.activeWallet = await this.director.createWallet()
    }

    const wallet = this.activeWallet
    const sdkClientName = getSdkClientName(walletName, federationId)
    applyClientNameToWallet(wallet, sdkClientName)

    const isKnownWallet = this.knownWalletNames.has(walletName)
    let ready = false

    if (isKnownWallet) {
      ready = await this.tryOpenWallet(wallet, walletName, sdkClientName)
      if (!ready) {
        ready = await this.tryJoinFederation(wallet, inviteCode, walletName, sdkClientName)
      }
    } else {
      ready = await this.tryJoinFederation(wallet, inviteCode, walletName, sdkClientName)
      if (!ready) {
        ready = await this.tryOpenWallet(wallet, walletName, sdkClientName)
      }
    }

    if (!ready) {
      throw new Error(`Unable to open or join wallet '${walletName}'`)
    }

    this.activeWalletName = walletName
    this.knownWalletNames.add(walletName)

    logger.logWalletOperation('Fedimint wallet opened', {
      walletName,
      federationId,
      sdkClientName,
    })

    return wallet
  }

  async getMnemonic(): Promise<string[]> {
    await this.init()

    if (this.director == null) {
      throw new Error('Wallet director is not initialized')
    }

    return extractMnemonicWords(await this.director.getMnemonic(), 'get')
  }

  async getMnemonicIfSet(): Promise<string[] | null> {
    try {
      return await this.getMnemonic()
    } catch (error) {
      if (isRecoverableMnemonicReadError(error)) {
        logger.warn('Mnemonic not set yet; returning null for read-only check', {
          reason: getErrorMessage(error),
        })
        return null
      }
      throw error
    }
  }

  async generateMnemonic(): Promise<string[]> {
    await this.init()

    if (this.director == null) {
      throw new Error('Wallet director is not initialized')
    }

    return extractMnemonicWords(await this.director.generateMnemonic(), 'generate')
  }

  async setMnemonic(words: string[]): Promise<void> {
    await this.init()

    if (this.director == null) {
      throw new Error('Wallet director is not initialized')
    }

    const normalizedWords = extractMnemonicWords(words, 'set')
    const success = await this.director.setMnemonic(normalizedWords)
    if (!success) {
      throw new Error('Failed to set wallet mnemonic')
    }
  }

  async ensureMnemonic(): Promise<EnsureMnemonicResult> {
    try {
      const existingWords = await this.getMnemonic()
      if (existingWords.length > 0) {
        return {
          words: existingWords,
          created: false,
        }
      }
    } catch (error) {
      if (!isRecoverableMnemonicReadError(error)) {
        throw error
      }
      logger.warn('Mnemonic missing/invalid -> generating', {
        reason: getErrorMessage(error),
      })
    }

    const generatedWords = await this.generateMnemonic()
    logger.logWalletOperation('Mnemonic generated successfully')
    return {
      words: generatedWords,
      created: true,
    }
  }

  getActiveWallet(): FedimintWallet | null {
    return this.activeWallet
  }

  async closeActiveWallet(): Promise<void> {
    if (this.activeWallet != null) {
      await this.activeWallet.cleanup()
      this.activeWallet = null
      this.activeWalletName = null
    }

    logger.logWalletOperation('Fedimint active wallet closed')
  }

  async deleteWallet(walletName: string): Promise<void> {
    if (this.activeWalletName === walletName) {
      await this.closeActiveWallet()
    }

    await this.deleteDatabaseByWalletName(walletName)
    this.knownWalletNames.delete(walletName)

    logger.logWalletOperation('Fedimint wallet deleted', { walletName })
  }

  async clearAllWallets(): Promise<void> {
    await this.closeActiveWallet()

    const walletNames = [...this.knownWalletNames]
    for (const walletName of walletNames) {
      // eslint-disable-next-line no-await-in-loop
      await this.deleteDatabaseByWalletName(walletName)
    }

    this.knownWalletNames.clear()

    logger.logWalletOperation('Fedimint wallets cleared')
  }

  listWallets(): Promise<string[]> {
    return Promise.resolve([...this.knownWalletNames])
  }

  reset(): void {
    this.director = null
    this.activeWallet = null
    this.activeWalletName = null
    this.knownWalletNames.clear()
  }

  private async tryOpenWallet(
    wallet: FedimintWallet,
    walletName: string,
    sdkClientName: string,
  ): Promise<boolean> {
    try {
      const result = await wallet.open(sdkClientName)
      if (typeof result === 'boolean') {
        return result
      }
    } catch (error) {
      logger.warn('Fedimint wallet open failed', {
        walletName,
        sdkClientName,
        reason: getErrorMessage(error),
      })
    }

    if (wallet.isOpen()) {
      return true
    }

    logger.warn('Fedimint wallet open returned false', {
      walletName,
      sdkClientName,
    })

    return false
  }

  private async tryJoinFederation(
    wallet: FedimintWallet,
    inviteCode: string,
    walletName: string,
    sdkClientName: string,
  ): Promise<boolean> {
    try {
      const result = await wallet.joinFederation(inviteCode, sdkClientName)
      if (typeof result === 'boolean') {
        return result || wallet.isOpen()
      }
      return wallet.isOpen()
    } catch (error) {
      if (isExistingClientError(error)) {
        logger.warn('Fedimint joinFederation indicates existing client; falling back to open', {
          walletName,
          sdkClientName,
          reason: getErrorMessage(error),
        })
        return false
      }
      logger.warn('Fedimint joinFederation failed', {
        walletName,
        sdkClientName,
        reason: getErrorMessage(error),
      })
      throw error instanceof Error ? error : new Error(String(error))
    }
  }

  private async deleteDatabaseByWalletName(walletName: string): Promise<void> {
    if (typeof indexedDB === 'undefined') {
      return
    }

    if (walletName === '') {
      return
    }

    const legacyFederationId = walletName.startsWith(WALLET_NAME_PREFIX)
      ? walletName.slice(WALLET_NAME_PREFIX.length)
      : ''
    const databaseNames = Array.from(
      new Set([walletName, legacyFederationId].filter((name) => name !== '')),
    )

    for (const databaseName of databaseNames) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(databaseName)

        request.onsuccess = () => resolve()
        request.onerror = () =>
          reject(new Error(`Failed to delete federation database '${databaseName}'`))
        request.onblocked = () => {
          logger.warn('Federation database deletion blocked', { databaseName })
          resolve()
        }
      })
    }
  }
}

function normalizePreviewResult(value: unknown): PreviewFederationResponse {
  if (value == null || typeof value !== 'object') {
    throw new Error('Invalid federation preview response')
  }

  const preview = value as Record<string, unknown>
  const federationIdRaw = preview.federation_id ?? preview.federationId
  const federationId = typeof federationIdRaw === 'string' ? federationIdRaw : ''
  const config = preview.config ?? preview.federation_config ?? {}

  if (federationId === '') {
    throw new Error('Federation preview response is missing federation id')
  }

  return {
    config,
    federation_id: federationId,
  }
}

function extractMnemonicWords(value: unknown, source: 'get' | 'generate' | 'set'): string[] {
  const shape = getMnemonicValueShape(value)
  let words: string[] = []

  if (Array.isArray(value)) {
    words = value
      .map((word) => (typeof word === 'string' ? word.trim() : ''))
      .filter((word) => word !== '')
  } else if (typeof value === 'string') {
    words = value
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word !== '')
  } else if (value != null && typeof value === 'object' && 'mnemonic' in value) {
    const mnemonicValue = (value as Record<string, unknown>).mnemonic
    words = extractMnemonicWords(mnemonicValue, source)
  }

  if (words.length === 0) {
    logger.warn('Mnemonic extraction failed', { source, shape })
    throw new MnemonicExtractionError(
      source,
      shape,
      Array.isArray(value) ? MNEMONIC_EMPTY_MESSAGE : INVALID_MNEMONIC_RESPONSE_MESSAGE,
    )
  }

  return words
}

function getMnemonicValueShape(value: unknown): string {
  if (Array.isArray(value)) {
    return 'array'
  }
  if (typeof value === 'string') {
    return 'string'
  }
  if (value != null && typeof value === 'object') {
    if ('mnemonic' in value) {
      const mnemonic = (value as Record<string, unknown>).mnemonic
      if (Array.isArray(mnemonic)) {
        return 'object:mnemonic-array'
      }
      if (typeof mnemonic === 'string') {
        return 'object:mnemonic-string'
      }
      return 'object:mnemonic-other'
    }
    return 'object'
  }
  if (value === null) {
    return 'null'
  }
  return typeof value
}

function applyClientNameToWallet(wallet: FedimintWallet, clientName: string): void {
  const walletWithInternals = wallet as unknown as Record<string, unknown>
  walletWithInternals._clientName = clientName

  const serviceKeys = ['mint', 'lightning', 'balance', 'federation', 'recovery', 'wallet'] as const
  for (const key of serviceKeys) {
    const service = walletWithInternals[key]
    if (service != null && typeof service === 'object') {
      ;(service as Record<string, unknown>).clientName = clientName
    }
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

function isMissingMnemonicError(error: unknown): boolean {
  return /no wallet mnemonic set/i.test(getErrorMessage(error))
}

function isInvalidMnemonicReadError(error: unknown): boolean {
  return (
    error instanceof MnemonicExtractionError &&
    error.source === 'get' &&
    /invalid mnemonic response|mnemonic is empty/i.test(error.message)
  )
}

function isRecoverableMnemonicReadError(error: unknown): boolean {
  return isMissingMnemonicError(error) || isInvalidMnemonicReadError(error)
}

function isExistingClientError(error: unknown): boolean {
  return /already exists|already joined|already open|client already exists|client exists|no modification allowed|nomodificationallowederror/i.test(
    getErrorMessage(error),
  )
}

function getSdkClientName(walletName: string, federationId: string): string {
  const stableSeed = federationId !== '' ? federationId : walletName
  return uuidv5(`vipr-wallet:${stableSeed}`, FEDIMINT_CLIENT_NAME_NAMESPACE)
}

export const fedimintClient = new FedimintClientAdapter()
export type { EnsureWalletOpenArgs, PreviewFederationResponse, EnsureMnemonicResult }
