const BITCOIN_URI_PREFIX = 'bitcoin:'
const BASE58_ADDRESS_PATTERN =
  /^(?:[13][1-9A-HJ-NP-Za-km-z]{25,34}|[mn2][1-9A-HJ-NP-Za-km-z]{25,34})$/
const BECH32_ADDRESS_PATTERN = /^(?:bc1|tb1|bcrt1)[ac-hj-np-z02-9]{11,87}$/i

export type ParsedBitcoinInput = {
  address: string
  amountSats?: number
  label?: string
  message?: string
}

export function parseBitcoinInput(input: string): ParsedBitcoinInput {
  const trimmedInput = input.trim()

  if (trimmedInput === '') {
    throw new Error('Enter a Bitcoin address or Bitcoin URI')
  }

  if (trimmedInput.toLowerCase().startsWith(BITCOIN_URI_PREFIX)) {
    return parseBitcoinUri(trimmedInput)
  }

  if (!isBitcoinAddress(trimmedInput)) {
    throw new Error('Enter a valid Bitcoin address')
  }

  return {
    address: trimmedInput,
  }
}

export function parseBitcoinUri(uri: string): ParsedBitcoinInput {
  const trimmedUri = uri.trim()
  const lowercaseUri = trimmedUri.toLowerCase()

  if (!lowercaseUri.startsWith(BITCOIN_URI_PREFIX)) {
    throw new Error('Enter a valid Bitcoin URI')
  }

  const payload = trimmedUri.slice(BITCOIN_URI_PREFIX.length)
  const [rawAddress = '', rawQuery = ''] = payload.split('?')
  const address = rawAddress.trim()

  if (!isBitcoinAddress(address)) {
    throw new Error('Bitcoin URI is missing a valid destination address')
  }

  const query = new URLSearchParams(rawQuery)
  const amountParam = query.get('amount')
  const label = normalizeOptionalField(query.get('label'))
  const message = normalizeOptionalField(query.get('message'))
  const parsedInput: ParsedBitcoinInput = {
    address,
  }

  if (amountParam != null) {
    parsedInput.amountSats = parseBitcoinAmountToSats(amountParam)
  }

  if (label != null) {
    parsedInput.label = label
  }

  if (message != null) {
    parsedInput.message = message
  }

  return parsedInput
}

export function isBitcoinAddress(value: string): boolean {
  const trimmedValue = value.trim()

  if (trimmedValue === '') {
    return false
  }

  if (isBase58BitcoinAddress(trimmedValue)) {
    return true
  }

  return isBech32BitcoinAddress(trimmedValue)
}

export function parseBitcoinAmountToSats(amount: string): number {
  const normalizedAmount = amount.trim()

  if (!/^\d+(?:\.\d{1,8})?$/.test(normalizedAmount)) {
    throw new Error('Bitcoin URI amount must be a BTC value with up to 8 decimals')
  }

  const [rawWholePart, fractionalPart = ''] = normalizedAmount.split('.')
  const wholePart = rawWholePart ?? '0'
  const sats = Number.parseInt(wholePart, 10) * 100_000_000
  const fractionalSats = Number.parseInt(fractionalPart.padEnd(8, '0'), 10)
  const amountSats = sats + fractionalSats

  if (!Number.isSafeInteger(amountSats) || amountSats <= 0) {
    throw new Error('Bitcoin URI amount must be greater than 0 sats')
  }

  return amountSats
}

function normalizeOptionalField(value: string | null): string | undefined {
  if (value == null) {
    return undefined
  }

  const trimmedValue = value.trim()
  return trimmedValue === '' ? undefined : trimmedValue
}

function isBase58BitcoinAddress(address: string): boolean {
  return BASE58_ADDRESS_PATTERN.test(address)
}

function isBech32BitcoinAddress(address: string): boolean {
  if (address !== address.toLowerCase() && address !== address.toUpperCase()) {
    return false
  }

  return BECH32_ADDRESS_PATTERN.test(address)
}
