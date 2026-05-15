import type * as BitcoinConnect from '@getalby/bitcoin-connect'

type BitcoinConnectModule = typeof BitcoinConnect
type BitcoinConnectConfig = Parameters<BitcoinConnectModule['init']>[0]

const defaultConfig: BitcoinConnectConfig = {
  appName: 'Vipr Wallet',
}

let bitcoinConnectModulePromise: Promise<BitcoinConnectModule> | null = null
let isInitialized = false

export function loadBitcoinConnect(): Promise<BitcoinConnectModule> {
  bitcoinConnectModulePromise ??= import('@getalby/bitcoin-connect').catch((error: unknown) => {
    bitcoinConnectModulePromise = null
    throw error
  })
  return bitcoinConnectModulePromise
}

export async function initBitcoinConnect(
  config: BitcoinConnectConfig = defaultConfig,
): Promise<BitcoinConnectModule> {
  const bitcoinConnect = await loadBitcoinConnect()

  if (!isInitialized) {
    bitcoinConnect.init(config)
    isInitialized = true
  }

  return bitcoinConnect
}
