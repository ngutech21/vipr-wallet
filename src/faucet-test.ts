import { FaucetService } from '../test/e2e/utils/FaucetService'
import { logger } from 'src/services/logger'

async function main() {
  const invoice = process.argv[2]
  if (invoice == null || invoice.trim() === '') {
    logger.info('Usage: pnpm pay:faucet <BOLT11>')
    process.exit(1)
  }

  const faucet = new FaucetService()
  try {
    logger.info('Paying invoice...')
    const result = await faucet.payFaucetInvoice(invoice)
    logger.info('Faucet response:', result)
  } catch (e) {
    logger.info('Error:', e)
    process.exit(1)
  }
}

await main()
