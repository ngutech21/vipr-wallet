/* eslint-disable @typescript-eslint/no-unused-vars */
import { useWalletStore } from 'src/stores/wallet'
import { useFederationStore } from 'src/stores/federation'
import { defineBoot } from '#q-app/wrappers'
import { Loading } from 'quasar'
import { logger } from 'src/services/logger'

export default defineBoot(async ({ app, router }) => {
  Loading.show()
  const walletStore = useWalletStore()
  const federationStore = useFederationStore()
  try {
    walletStore.initDirector()
    await walletStore.openWallet()
  } catch (error) {
    logger.error('Failed to initialize wallet:', error)
    if (federationStore.selectedFederationId != null) {
      logger.warn('Clearing selected federation after startup wallet failure', {
        selectedFederationId: federationStore.selectedFederationId,
      })
      federationStore.selectedFederationId = null
    }
  } finally {
    Loading.hide()
  }
})
