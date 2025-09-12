import { bech32 } from 'bech32'
import { logger } from 'src/services/logger'
import { Buffer } from 'buffer'

function decodeLnurl(lnurl: string): string {
  const { words } = bech32.decode(lnurl.toLowerCase(), 1500)
  const urlBytes = bech32.fromWords(words)
  return Buffer.from(urlBytes).toString('utf8')
}

async function getLnurlPayParams(lnurl: string) {
  try {
    const originalUrl = decodeLnurl(lnurl)
    // Use a proxy to avoid CORS issues
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(originalUrl)}`

    const res = await fetch(proxyUrl, {
      headers: {
        Accept: 'application/json',
      },
    })

    const data = await res.json()
    const json = JSON.parse(data.contents)

    if (data.status === 'ERROR' || data.reason != null || data.error != null) {
      throw new Error(`LNURL error: ${data.reason ?? data.error ?? 'Unknown error'}`)
    }

    if (json.tag !== 'payRequest') {
      throw new Error('LNURL is not a valid payRequest Typ: ' + JSON.stringify(data))
    }

    return json
  } catch (error) {
    logger.error('LNURL request failed', error)
    throw error
  }
}

export async function requestInvoice(lnurl: string, amountSat: number): Promise<string> {
  const params = await getLnurlPayParams(lnurl)
  const amountMsat = amountSat * 1_000

  logger.lightning.debug('Requesting LNURL invoice', { params, amountSat })

  try {
    // Create the callback URL with the amount parameter
    const callbackUrl = new URL(params.callback)
    callbackUrl.searchParams.set('amount', amountMsat.toString())

    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(callbackUrl.toString())}`

    const res = await fetch(proxyUrl)
    const data = await res.json()
    const json = JSON.parse(data.contents)

    if (data.error != null) {
      throw new Error(`Invoice error: ${data.error ?? 'Unknown error'}`)
    }

    if (json.pr == null) {
      throw new Error('Error creating invoice: ' + JSON.stringify(json))
    }

    return json.pr
  } catch (error) {
    logger.error('LNURL invoice request failed', error)
    throw error
  }
}
