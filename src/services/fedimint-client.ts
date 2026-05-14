import { WalletDirector, type FedimintWallet, type ParsedNoteDetails } from '@fedimint/core'
import { WasmWorkerTransport } from '@fedimint/transport-web'
import { v5 as uuidv5 } from 'uuid'
import { logger } from 'src/services/logger'
import { getErrorMessage } from 'src/utils/error'

type PreviewFederationResponse = {
  config: unknown
  federation_id: string
}

type EnsureWalletOpenArgs = {
  walletName: string
  federationId: string
  inviteCode: string
  recoverOnJoin?: boolean
}

type EnsureMnemonicResult = {
  words: string[]
  created: boolean
}

type FedimintLogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none'

const WALLET_NAME_PREFIX = 'wallet-'
const FEDIMINT_INIT_RETRY_DELAYS_MS = [0, 50, 150, 500, 1_000, 2_000] as const
const INVALID_MNEMONIC_RESPONSE_MESSAGE = 'Invalid mnemonic response'
const MNEMONIC_EMPTY_MESSAGE = 'Mnemonic is empty'
const FEDIMINT_CLIENT_NAME_NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8'

class FedimintClientAdapter {
  private director: WalletDirector | null = null
  private activeWallet: FedimintWallet | null = null
  private activeWalletName: string | null = null
  private knownWalletNames = new Set<string>()

  async init(): Promise<void> {
    if (this.director != null) {
      return
    }

    let lastError: unknown

    for (const delayMs of FEDIMINT_INIT_RETRY_DELAYS_MS) {
      if (delayMs > 0) {
        // eslint-disable-next-line no-await-in-loop
        await delay(delayMs)
      }

      try {
        const director = new WalletDirector(new WasmWorkerTransport(), undefined, true)
        // eslint-disable-next-line no-await-in-loop
        await director.initialize()
        this.director = director

        logger.logWalletOperation('Fedimint wallet director initialized', { delayMs })
        return
      } catch (error) {
        lastError = error

        if (!isFedimintStorageHandleLockedError(error) || isLastInitAttempt(delayMs)) {
          break
        }

        logger.warn('Fedimint wallet director initialization locked; retrying', {
          delayMs,
          nextDelayMs: nextInitDelay(delayMs),
          reason: getErrorMessage(error),
        })
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError))
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

  async parseOobNotes(notes: string): Promise<ParsedNoteDetails> {
    await this.init()

    if (this.director == null) {
      throw new Error('Wallet director is not initialized')
    }

    return await this.director.parseOobNotes(notes)
  }

  async ensureWalletOpen({
    walletName,
    federationId,
    inviteCode,
    recoverOnJoin = false,
  }: EnsureWalletOpenArgs): Promise<FedimintWallet> {
    await this.init()

    if (this.director == null) {
      throw new Error('Wallet director is not initialized')
    }

    if (this.activeWallet != null && this.activeWalletName !== walletName) {
      await this.closeActiveWallet()
      await this.init()
      if (this.director == null) {
        throw new Error('Wallet director is not initialized')
      }
    }

    if (this.activeWallet == null) {
      this.activeWallet = await this.director.createWallet()
    }

    const wallet = this.activeWallet
    const sdkClientName = getSdkClientName(walletName, federationId)
    applyClientNameToWallet(wallet, sdkClientName)

    const isKnownWallet = this.knownWalletNames.has(walletName)
    logger.logWalletOperation('Fedimint ensureWalletOpen started', {
      walletName,
      federationId,
      sdkClientName,
      isKnownWallet,
      activeWalletName: this.activeWalletName,
      preferredPath: isKnownWallet ? 'open-then-join' : 'join-then-open',
      recoverOnJoin,
    })

    const ready = isKnownWallet
      ? (await this.tryOpenWallet(wallet, walletName, sdkClientName)) ||
        (await this.tryJoinFederation(wallet, inviteCode, walletName, sdkClientName, recoverOnJoin))
      : (await this.tryJoinFederation(
          wallet,
          inviteCode,
          walletName,
          sdkClientName,
          recoverOnJoin,
        )) || (await this.tryOpenWallet(wallet, walletName, sdkClientName))

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
    const mnemonicValue = await this.getMnemonicValue()
    if (mnemonicValue == null) {
      throw new Error('No wallet mnemonic set')
    }

    return normalizeMnemonicWords(mnemonicValue, 'get')
  }

  async getMnemonicIfSet(): Promise<string[] | null> {
    if (!(await this.hasMnemonicSet())) {
      return null
    }

    return await this.getMnemonic()
  }

  async generateMnemonic(): Promise<string[]> {
    await this.init()

    if (this.director == null) {
      throw new Error('Wallet director is not initialized')
    }

    return normalizeMnemonicWords(await this.director.generateMnemonic(), 'generate')
  }

  async setMnemonic(words: string[]): Promise<void> {
    await this.init()

    if (this.director == null) {
      throw new Error('Wallet director is not initialized')
    }

    const normalizedWords = normalizeMnemonicWords(words, 'set')
    const success = await this.director.setMnemonic(normalizedWords)
    if (!success) {
      throw new Error('Failed to set wallet mnemonic')
    }
  }

  async hasMnemonicSet(): Promise<boolean> {
    await this.init()

    if (this.director == null) {
      throw new Error('Wallet director is not initialized')
    }

    return await this.director.hasMnemonicSet()
  }

  async ensureMnemonic(): Promise<EnsureMnemonicResult> {
    const existingWords = await this.getMnemonicIfSet()
    if (existingWords != null) {
      return {
        words: existingWords,
        created: false,
      }
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
      // The SDK documents cleanup() as terminal for the wallet/transport lifecycle.
      // Recreate the director on the next init so federation switches start with a fresh worker.
      await this.activeWallet.cleanup()
      this.activeWallet = null
      this.activeWalletName = null
      this.director = null
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

  private async getMnemonicValue(): Promise<unknown> {
    await this.init()

    if (this.director == null) {
      throw new Error('Wallet director is not initialized')
    }

    return await this.director.getMnemonic()
  }

  private async tryOpenWallet(
    wallet: FedimintWallet,
    walletName: string,
    sdkClientName: string,
  ): Promise<boolean> {
    const startedAt = Date.now()
    try {
      const result = await wallet.open(sdkClientName)
      if (typeof result === 'boolean') {
        logger.logWalletOperation('Fedimint open_client completed', {
          walletName,
          sdkClientName,
          result,
          walletIsOpen: wallet.isOpen(),
          durationMs: Date.now() - startedAt,
        })
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
      logger.logWalletOperation('Fedimint open_client left wallet open', {
        walletName,
        sdkClientName,
        durationMs: Date.now() - startedAt,
      })
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
    recoverOnJoin: boolean,
  ): Promise<boolean> {
    const startedAt = Date.now()
    try {
      const result = recoverOnJoin
        ? await joinFederationWithRecover(wallet, inviteCode, sdkClientName)
        : await wallet.joinFederation(inviteCode, sdkClientName)
      if (typeof result === 'boolean') {
        const walletIsOpen = wallet.isOpen()
        logger.logWalletOperation('Fedimint join_federation completed', {
          walletName,
          sdkClientName,
          recoverOnJoin,
          result,
          walletIsOpen,
          durationMs: Date.now() - startedAt,
        })
        return result || walletIsOpen
      }
      logger.logWalletOperation('Fedimint join_federation returned non-boolean', {
        walletName,
        sdkClientName,
        recoverOnJoin,
        walletIsOpen: wallet.isOpen(),
        durationMs: Date.now() - startedAt,
      })
      return wallet.isOpen()
    } catch (error) {
      if (isExistingClientError(error)) {
        logger.warn('Fedimint joinFederation indicates existing client; falling back to open', {
          walletName,
          sdkClientName,
          recoverOnJoin,
          reason: getErrorMessage(error),
        })
        return false
      }
      logger.warn('Fedimint joinFederation failed', {
        walletName,
        sdkClientName,
        recoverOnJoin,
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

function normalizeMnemonicWords(value: unknown, source: 'get' | 'generate' | 'set'): string[] {
  const objectValue =
    value != null && typeof value === 'object' ? (value as Record<string, unknown>) : null
  const nestedData =
    objectValue?.data != null && typeof objectValue.data === 'object'
      ? (objectValue.data as Record<string, unknown>)
      : null
  const rawWords = Array.isArray(value)
    ? value
    : objectValue != null && Array.isArray(objectValue.mnemonic)
      ? objectValue.mnemonic
      : objectValue != null && Array.isArray(objectValue.words)
        ? objectValue.words
        : nestedData != null && Array.isArray(nestedData.mnemonic)
          ? nestedData.mnemonic
          : nestedData != null && Array.isArray(nestedData.words)
            ? nestedData.words
            : null

  if (rawWords == null) {
    logger.warn('Mnemonic extraction failed', { source, shape: typeof value })
    throw new Error(INVALID_MNEMONIC_RESPONSE_MESSAGE)
  }

  const words = rawWords
    .map((word) => (typeof word === 'string' ? word.trim() : ''))
    .filter((word) => word !== '')

  if (words.length === 0) {
    logger.warn('Mnemonic extraction failed', { source, shape: 'array-empty' })
    throw new Error(MNEMONIC_EMPTY_MESSAGE)
  }

  return words
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

type JoinFederationTransportClient = {
  sendSingleMessage: <Response = unknown, Payload = unknown>(
    type: string,
    payload?: Payload,
  ) => Promise<Response>
}

type FedimintWalletInternals = {
  _client?: JoinFederationTransportClient
  _isOpen?: boolean
  _resolveOpen?: () => void
}

async function joinFederationWithRecover(
  wallet: FedimintWallet,
  inviteCode: string,
  clientName: string,
): Promise<boolean> {
  if (wallet.isOpen()) {
    throw new Error(
      'The FedimintWallet is already open. You can only call `joinFederation` on closed clients.',
    )
  }

  const walletInternals = wallet as unknown as FedimintWalletInternals
  const client = walletInternals._client
  if (client == null || typeof client.sendSingleMessage !== 'function') {
    throw new Error('Fedimint wallet transport client is not available for recovery join')
  }

  await client.sendSingleMessage('join_federation', {
    invite_code: inviteCode,
    client_name: clientName,
    force_recover: true,
  })

  walletInternals._isOpen = true
  walletInternals._resolveOpen?.()
  return true
}

function isExistingClientError(error: unknown): boolean {
  return /already exists|already joined|already open|client already exists|client exists|no modification allowed|nomodificationallowederror/i.test(
    getErrorMessage(error),
  )
}

function isFedimintStorageHandleLockedError(error: unknown): boolean {
  return /access handle|createsyncaccesshandle|another.*access handle|already.*access handle|modifications are not allowed|nomodificationallowederror/i.test(
    getErrorMessage(error),
  )
}

function isLastInitAttempt(delayMs: number): boolean {
  return delayMs === FEDIMINT_INIT_RETRY_DELAYS_MS.at(-1)
}

function nextInitDelay(delayMs: number): number | null {
  const currentIndex = FEDIMINT_INIT_RETRY_DELAYS_MS.indexOf(
    delayMs as (typeof FEDIMINT_INIT_RETRY_DELAYS_MS)[number],
  )
  return FEDIMINT_INIT_RETRY_DELAYS_MS[currentIndex + 1] ?? null
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms)
  })
}

function getSdkClientName(walletName: string, federationId: string): string {
  const stableSeed = federationId !== '' ? federationId : walletName
  return uuidv5(`vipr-wallet:${stableSeed}`, FEDIMINT_CLIENT_NAME_NAMESPACE)
}

export const fedimintClient = new FedimintClientAdapter()
export type { EnsureWalletOpenArgs, PreviewFederationResponse, EnsureMnemonicResult }
