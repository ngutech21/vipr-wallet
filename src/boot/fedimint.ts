/* eslint-disable @typescript-eslint/no-unused-vars */
import { useWalletStore } from 'src/stores/wallet'
import { defineBoot } from '#q-app/wrappers'
import { Loading } from 'quasar'
import { logger } from 'src/services/logger'

export default defineBoot(async ({ app, router }) => {
  Loading.show()
  const walletStore = useWalletStore()
  try {
    walletStore.initDirector()
    await walletStore.openWallet()
  } catch (error) {
    logger.error('Failed to initialize wallet:', error)
  } finally {
    Loading.hide()
  }
})
