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
let pwaUpdateHooksRegistered = false

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
    (onboardingStatus === 'in_progress' && onboardingFlow === 'create' && needsMnemonicBackup)
  )
}

function registerPwaUpdateHooks(
  router: {
    currentRoute: { value: { name?: string | symbol | null } }
    afterEach?: (guard: (to: { name?: string | symbol | null }) => void) => void
  },
  pwaUpdateStore: {
    checkForUpdatesForeground: () => Promise<unknown>
    resumePendingApplyIfAny: (routeName: unknown) => Promise<void>
  },
) {
  if (pwaUpdateHooksRegistered) {
    return
  }
  pwaUpdateHooksRegistered = true

  const runForegroundUpdateTasks = () => {
    const routeName = router.currentRoute.value.name
    pwaUpdateStore.checkForUpdatesForeground().catch((error) => {
      logger.pwa.warn('Foreground update check failed', { error })
    })
    pwaUpdateStore.resumePendingApplyIfAny(routeName).catch((error) => {
      logger.pwa.warn('Failed to resume pending update apply', { error })
    })
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        runForegroundUpdateTasks()
      }
    })
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      runForegroundUpdateTasks()
    })
  }

  if (typeof router.afterEach === 'function') {
    router.afterEach((to) => {
      pwaUpdateStore.resumePendingApplyIfAny(to.name).catch((error) => {
        logger.pwa.warn('Failed to resume pending update apply after navigation', { error })
      })
    })
  }
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
    try {
      await pwaUpdateStore.checkForUpdatesStartup()
      await pwaUpdateStore.resumePendingApplyIfAny(router.currentRoute.value.name)
    } catch (error) {
      logger.pwa.warn('Startup update check failed', { error })
    }
    registerPwaUpdateHooks(router, pwaUpdateStore)
    Loading.hide()
  }
})
