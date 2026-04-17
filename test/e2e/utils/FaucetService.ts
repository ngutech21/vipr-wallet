type BitcoindRpcConfig = {
  rpcUrl: string
  authHeader: string
}

type JsonRpcSuccess<T> = {
  result: T
  error: null
  id: string
}

type JsonRpcFailure = {
  result: null
  error: {
    code: number
    message: string
  }
  id: string
}

type JsonRpcResponse<T> = JsonRpcSuccess<T> | JsonRpcFailure

export class FaucetService {
  FAUCET_URL = 'http://127.0.0.1:15243'
  private bitcoindRpcConfig: BitcoindRpcConfig | null = null

  async getInviteCode() {
    const res = await fetch(`${this.FAUCET_URL}/connect-string`)
    if (res.ok) {
      return await res.text()
    } else {
      throw new Error(`Failed to get invite code: ${await res.text()}`)
    }
  }

  async getFaucetGatewayApi() {
    const res = await fetch(`${this.FAUCET_URL}/gateway-api`)
    if (res.ok) {
      return await res.text()
    } else {
      throw new Error(`Failed to get gateway: ${await res.text()}`)
    }
  }

  async payFaucetInvoice(invoice: string) {
    const res = await fetch(`${this.FAUCET_URL}/pay`, {
      method: 'POST',
      body: invoice.trim(),
      headers: { 'Content-Type': 'text/plain' },
    })
    if (res.ok) {
      return await res.text()
    } else {
      throw new Error(`Failed to pay faucet invoice: ${await res.text()}`)
    }
  }

  async createFaucetInvoice(amount: number) {
    const res = await fetch(`${this.FAUCET_URL}/invoice`, {
      method: 'POST',
      body: amount.toString(),
    })
    if (res.ok) {
      return await res.text()
    } else {
      throw new Error(`Failed to generate faucet invoice: ${await res.text()}`)
    }
  }

  async mineBlocks(
    blocks: number,
  ): Promise<{ startHeight: number; endHeight: number; blockHashes: string[] }> {
    this.assertPositiveInteger(blocks, 'blocks')

    const miningAddress = await this.callBitcoind<string>('getnewaddress')
    const startHeight = await this.callBitcoind<number>('getblockcount')
    const blockHashes = await this.callBitcoind<string[]>('generatetoaddress', [
      blocks,
      miningAddress,
    ])
    const endHeight = await this.callBitcoind<number>('getblockcount')

    return {
      startHeight,
      endHeight,
      blockHashes,
    }
  }

  async sendToAddress(address: string, amountSats: number): Promise<{ txid: string }> {
    const normalizedAddress = address.trim()
    this.assertNonEmpty(normalizedAddress, 'address')
    this.assertPositiveInteger(amountSats, 'amountSats')

    const txid = await this.callBitcoind<string>('sendtoaddress', [
      normalizedAddress,
      this.satsToBitcoinAmount(amountSats),
    ])

    return { txid }
  }

  async sendToAddressAndMine(
    address: string,
    amountSats: number,
    blocks = 1,
  ): Promise<{ txid: string; startHeight: number; endHeight: number; blockHashes: string[] }> {
    const { txid } = await this.sendToAddress(address, amountSats)
    const mined = await this.mineBlocks(blocks)

    return {
      txid,
      ...mined,
    }
  }

  private getBitcoindRpcConfig(): BitcoindRpcConfig {
    if (this.bitcoindRpcConfig != null) {
      return this.bitcoindRpcConfig
    }

    const rawUrl = process.env.FM_BITCOIND_URL?.trim()
    if (rawUrl == null || rawUrl === '') {
      throw new Error('FM_BITCOIND_URL is required for onchain faucet operations')
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(rawUrl)
    } catch {
      throw new Error('FM_BITCOIND_URL must be a valid URL in the form http://user:pass@host:port')
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('FM_BITCOIND_URL must use http or https')
    }

    if (parsedUrl.username === '' || parsedUrl.password === '') {
      throw new Error('FM_BITCOIND_URL must include RPC username and password')
    }

    if (parsedUrl.hostname === '' || parsedUrl.port === '') {
      throw new Error('FM_BITCOIND_URL must include a host and port')
    }

    const username = decodeURIComponent(parsedUrl.username)
    const password = decodeURIComponent(parsedUrl.password)
    parsedUrl.username = ''
    parsedUrl.password = ''

    this.bitcoindRpcConfig = {
      rpcUrl: parsedUrl.toString(),
      authHeader: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
    }

    return this.bitcoindRpcConfig
  }

  private async callBitcoind<T>(method: string, params: unknown[] = []): Promise<T> {
    const { rpcUrl, authHeader } = this.getBitcoindRpcConfig()
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: `faucet-service:${method}`,
        method,
        params,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      const message = body.trim() === '' ? response.statusText : body.trim()
      throw new Error(`Bitcoind RPC ${method} failed with HTTP ${response.status}: ${message}`)
    }

    let payload: JsonRpcResponse<T>
    try {
      payload = (await response.json()) as JsonRpcResponse<T>
    } catch {
      throw new Error(`Bitcoind RPC ${method} returned invalid JSON`)
    }

    if (payload.error != null) {
      throw new Error(
        `Bitcoind RPC ${method} failed with code ${payload.error.code}: ${payload.error.message}`,
      )
    }

    return payload.result
  }

  private assertPositiveInteger(value: number, name: string) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`${name} must be a positive whole number`)
    }
  }

  private assertNonEmpty(value: string, name: string) {
    if (value === '') {
      throw new Error(`${name} must not be empty`)
    }
  }

  private satsToBitcoinAmount(amountSats: number): number {
    return Number((amountSats / 100_000_000).toFixed(8))
  }
}
