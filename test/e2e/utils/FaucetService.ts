export class FaucetService {
  FAUCET_URL = 'http://127.0.0.1:15243'

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
}
