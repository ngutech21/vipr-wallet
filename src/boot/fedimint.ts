/* eslint-disable @typescript-eslint/no-unused-vars */
import { useWalletStore } from 'src/stores/wallet'
import { useFederationStore } from 'src/stores/federation'
import { useOnboardingStore } from 'src/stores/onboarding'
import { useAppStore } from 'src/stores/app'
import { usePwaUpdateStore } from 'src/stores/pwa-update'
import { defineBoot } from '#q-app/wrappers'
import { Loading } from 'quasar'
import { logger } from 'src/services/logger'

const STARTUP_WIZARD_PATH = '/startup-wizard'

function isStartupWizardRoute(route: { path?: string; name?: string | symbol | null }): boolean {
  return route.path === STARTUP_WIZARD_PATH || route.name === STARTUP_WIZARD_PATH
}

function requiresStartupWizard(
  hasMnemonic: boolean,
  onboardingStatus: 'in_progress' | 'complete',
  onboardingFlow: 'create' | 'restore' | null,
  needsMnemonicBackup: boolean,
): boolean {
  return (
    !hasMnemonic ||
    (onboardingStatus === 'in_progress' &&
      onboardingFlow === 'create' &&
      needsMnemonicBackup)
  )
}

export default defineBoot(async ({ app, router }) => {
  Loading.show()
  const appStore = useAppStore()
  const walletStore = useWalletStore()
  const federationStore = useFederationStore()
  const onboardingStore = useOnboardingStore()
  const pwaUpdateStore = usePwaUpdateStore()
  appStore.setReady(false)
  try {
    await walletStore.ensureStorageSchema()
    await walletStore.loadMnemonic()
    onboardingStore.normalizeForWalletState({
      hasMnemonic: walletStore.hasMnemonic,
      needsMnemonicBackup: walletStore.needsMnemonicBackup,
    })

    const startupWizardRequired = requiresStartupWizard(
      walletStore.hasMnemonic,
      onboardingStore.status,
      onboardingStore.flow,
      walletStore.needsMnemonicBackup,
    )

    if (!startupWizardRequired) {
      await walletStore.openWallet()
    }

    if (typeof router.beforeEach === 'function') {
      router.beforeEach((to) => {
        const shouldOpenWizard = requiresStartupWizard(
          walletStore.hasMnemonic,
          onboardingStore.status,
          onboardingStore.flow,
          walletStore.needsMnemonicBackup,
        )

        if (shouldOpenWizard && !isStartupWizardRoute(to)) {
          return STARTUP_WIZARD_PATH
        }
        if (!shouldOpenWizard && isStartupWizardRoute(to)) {
          return '/'
        }
        return true
      })
    }

    if (startupWizardRequired && !isStartupWizardRoute(router.currentRoute.value)) {
      await router.replace(STARTUP_WIZARD_PATH)
    }
    if (!startupWizardRequired && isStartupWizardRoute(router.currentRoute.value)) {
      await router.replace('/')
    }
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
    pwaUpdateStore.checkForUpdatesStartup().catch((error) => {
      logger.pwa.warn('Startup update check failed', { error })
    })
    Loading.hide()
  }
})
