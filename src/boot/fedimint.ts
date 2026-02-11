/* eslint-disable @typescript-eslint/no-unused-vars */
import { useWalletStore } from 'src/stores/wallet'
import { useFederationStore } from 'src/stores/federation'
import { useAppStore } from 'src/stores/app'
import { defineBoot } from '#q-app/wrappers'
import { Loading } from 'quasar'
import { logger } from 'src/services/logger'

export default defineBoot(async ({ app, router }) => {
  Loading.show()
  const appStore = useAppStore()
  const walletStore = useWalletStore()
  const federationStore = useFederationStore()
  appStore.setReady(false)
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
    appStore.setReady(true)
    Loading.hide()
  }
})
