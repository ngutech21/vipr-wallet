import { bech32 } from 'bech32'
import { logger } from 'src/services/logger'
import { Buffer } from 'buffer'

export type LnurlPayParams = {
  tag: 'payRequest'
  callback: string
  minSendable?: number
  maxSendable?: number
  metadata?: string
  commentAllowed?: number
}

export type LnurlWithdrawParams = {
  tag: 'withdrawRequest'
  callback: string
  k1: string
  defaultDescription: string
  minWithdrawable: number
  maxWithdrawable: number
}

export type LnurlParams = LnurlPayParams | LnurlWithdrawParams

export function decodeLnurl(lnurl: string): string {
  const { words } = bech32.decode(lnurl.toLowerCase(), 1500)
  const urlBytes = bech32.fromWords(words)
  return Buffer.from(urlBytes).toString('utf8')
}

export async function resolveLnurl(lnurl: string): Promise<LnurlParams> {
  try {
    const originalUrl = decodeLnurl(lnurl)
    const json = await fetchLnurlJson(originalUrl)

    if (json.tag === 'payRequest') {
      return parseLnurlPayParams(json)
    }

    if (json.tag === 'withdrawRequest') {
      return parseLnurlWithdrawParams(json)
    }

    throw new Error(`Unsupported LNURL type: ${formatUnknown(json.tag, 'unknown')}`)
  } catch (error) {
    logger.error('LNURL request failed', error)
    throw error
  }
}

async function getLnurlPayParams(lnurl: string): Promise<LnurlPayParams> {
  const params = await resolveLnurl(lnurl)

  if (params.tag !== 'payRequest') {
    throw new Error(`LNURL is not a valid payRequest Type: ${JSON.stringify(params)}`)
  }

  return params
}

export async function requestInvoice(lnurl: string, amountSat: number): Promise<string> {
  const params = await getLnurlPayParams(lnurl)
  const amountMsat = amountSat * 1_000

  logger.lightning.debug('Requesting LNURL invoice', { params, amountSat })

  try {
    // Create the callback URL with the amount parameter
    const callbackUrl = new URL(params.callback)
    callbackUrl.searchParams.set('amount', amountMsat.toString())

    const json = await fetchLnurlJson(callbackUrl.toString(), { allowCallbackError: true })

    if (json.status === 'ERROR' || json.reason != null || json.error != null) {
      throw new Error(`Invoice error: ${formatUnknown(json.reason ?? json.error, 'Unknown error')}`)
    }

    if (typeof json.pr !== 'string' || json.pr === '') {
      throw new Error(`Error creating invoice: ${JSON.stringify(json)}`)
    }

    return json.pr
  } catch (error) {
    logger.error('LNURL invoice request failed', error)
    throw error
  }
}

export async function submitLnurlWithdrawInvoice(
  params: LnurlWithdrawParams,
  invoice: string,
): Promise<void> {
  try {
    const callbackUrl = new URL(params.callback)
    callbackUrl.searchParams.set('k1', params.k1)
    callbackUrl.searchParams.set('pr', invoice)

    const json = await fetchLnurlJson(callbackUrl.toString(), { allowCallbackError: true })

    if (json.status === 'ERROR' || json.reason != null || json.error != null) {
      throw new Error(
        `LNURL withdraw error: ${formatUnknown(json.reason ?? json.error, 'Unknown error')}`,
      )
    }

    if (json.status != null && json.status !== 'OK') {
      throw new Error(`LNURL withdraw failed: ${formatUnknown(json.status)}`)
    }
  } catch (error) {
    logger.error('LNURL withdraw request failed', error)
    throw error
  }
}

async function fetchLnurlJson(
  url: string,
  options: { allowCallbackError?: boolean } = {},
): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  })

  const data = (await res.json()) as Record<string, unknown>

  if (
    !options.allowCallbackError &&
    (data.status === 'ERROR' || data.reason != null || data.error != null)
  ) {
    throw new Error(`LNURL error: ${formatUnknown(data.reason ?? data.error, 'Unknown error')}`)
  }

  let responseData = data
  if (typeof data.contents === 'string') {
    responseData = JSON.parse(data.contents) as Record<string, unknown>
  }

  return {
    ...responseData,
    status: responseData.status ?? data.status,
    reason: responseData.reason ?? data.reason,
    error: responseData.error ?? data.error,
  }
}

function parseLnurlPayParams(data: Record<string, unknown>): LnurlPayParams {
  const callback = readString(data.callback)
  if (callback == null) {
    throw new Error('LNURL payRequest is missing callback')
  }

  const params: LnurlPayParams = {
    tag: 'payRequest',
    callback,
  }

  const minSendable = readNumber(data.minSendable)
  const maxSendable = readNumber(data.maxSendable)
  const metadata = readString(data.metadata)
  const commentAllowed = readNumber(data.commentAllowed)

  if (minSendable != null) {
    params.minSendable = minSendable
  }

  if (maxSendable != null) {
    params.maxSendable = maxSendable
  }

  if (metadata != null) {
    params.metadata = metadata
  }

  if (commentAllowed != null) {
    params.commentAllowed = commentAllowed
  }

  return params
}

function parseLnurlWithdrawParams(data: Record<string, unknown>): LnurlWithdrawParams {
  const callback = readString(data.callback)
  const k1 = readString(data.k1)
  const minWithdrawable = readNumber(data.minWithdrawable)
  const maxWithdrawable = readNumber(data.maxWithdrawable)

  if (callback == null) {
    throw new Error('LNURL withdrawRequest is missing callback')
  }

  if (k1 == null) {
    throw new Error('LNURL withdrawRequest is missing k1')
  }

  if (minWithdrawable == null || maxWithdrawable == null || minWithdrawable > maxWithdrawable) {
    throw new Error('LNURL withdrawRequest has invalid amount limits')
  }

  return {
    tag: 'withdrawRequest',
    callback,
    k1,
    defaultDescription: readString(data.defaultDescription) ?? '',
    minWithdrawable,
    maxWithdrawable,
  }
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function formatUnknown(value: unknown, fallback = 'Unknown error'): string {
  if (typeof value === 'string' && value.trim() !== '') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value.toString()
  }

  return fallback
}
