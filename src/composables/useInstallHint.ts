import { computed, ref } from 'vue'

export type InstallHintMode = 'android' | 'ios' | 'generic'

export type InstallInstruction = {
  title: string
  steps: string[]
}

export function useInstallHint() {
  const installHintMode = ref<InstallHintMode>('generic')
  const isStandaloneApp = ref(false)
  const needsNativeBrowser = ref(false)
  let standaloneMediaQuery: MediaQueryList | null = null

  const installInstruction = computed<InstallInstruction>(() => {
    if (installHintMode.value === 'android') {
      return {
        title: 'Install from Chrome on Android',
        steps: [
          'Open the browser menu in the top-right corner.',
          'Choose "Add to Home screen" or "Install app".',
        ],
      }
    }

    if (installHintMode.value === 'ios') {
      return {
        title: 'Install from Safari on iPhone',
        steps: ['Tap Share in Safari.', 'Choose "Add to Home Screen".'],
      }
    }

    return {
      title: 'Install on your phone before setup',
      steps: [
        'On iPhone, open Vipr in Safari, tap Share, then choose "Add to Home Screen".',
        'On Android, open Vipr in Chrome, open the menu, then choose "Add to Home screen" or "Install app".',
      ],
    }
  })

  const recommendedBrowserLabel = computed(() => {
    if (installHintMode.value === 'android') {
      return 'Chrome on Android'
    }
    if (installHintMode.value === 'ios') {
      return 'Safari on iPhone'
    }
    return 'Safari on iPhone or Chrome on Android'
  })

  const installHintDescription = computed(() => {
    if (installHintMode.value === 'android') {
      return 'Vipr feels better when it launches like an app from your Android home screen. Install it first, then continue setup from the new icon.'
    }

    if (installHintMode.value === 'ios') {
      return 'Vipr works best when it opens full screen from your iPhone home screen, without Safari bars getting in the way while you set up your wallet.'
    }

    return 'For the best wallet experience, install Vipr to your phone home screen first and continue setup from the app icon after that.'
  })

  const showInstallStep = computed(() => !isStandaloneApp.value)

  function initializeInstallHint() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return
    }

    const detectedMode = detectInstallHintMode()
    installHintMode.value = detectedMode
    needsNativeBrowser.value = detectNeedsNativeBrowser(detectedMode)

    if (typeof window.matchMedia === 'function') {
      standaloneMediaQuery = window.matchMedia('(display-mode: standalone)')
    }

    syncStandaloneState()

    if (standaloneMediaQuery == null) {
      return
    }

    if (typeof standaloneMediaQuery.addEventListener === 'function') {
      standaloneMediaQuery.addEventListener('change', syncStandaloneState)
      return
    }

    if (typeof standaloneMediaQuery.addListener === 'function') {
      standaloneMediaQuery.addListener(syncStandaloneState)
    }
  }

  function removeInstallHintListeners() {
    if (standaloneMediaQuery == null) {
      return
    }

    if (typeof standaloneMediaQuery.removeEventListener === 'function') {
      standaloneMediaQuery.removeEventListener('change', syncStandaloneState)
      return
    }

    if (typeof standaloneMediaQuery.removeListener === 'function') {
      standaloneMediaQuery.removeListener(syncStandaloneState)
    }
  }

  function detectInstallHintMode(): InstallHintMode {
    const userAgent = navigator.userAgent.toLowerCase()

    if (/iphone|ipad|ipod/.test(userAgent)) {
      return 'ios'
    }

    if (/android/.test(userAgent)) {
      return 'android'
    }

    return 'generic'
  }

  function detectNeedsNativeBrowser(mode: InstallHintMode): boolean {
    const userAgent = navigator.userAgent.toLowerCase()

    if (mode === 'ios') {
      const isSafari =
        /safari/.test(userAgent) && !/crios|fxios|edgios|opr|opera|duckduckgo/.test(userAgent)
      return !isSafari
    }

    if (mode === 'android') {
      const isChrome =
        /chrome|chromium/.test(userAgent) &&
        !/edga|edgios|opr|opera|samsungbrowser|firefox/.test(userAgent)
      return !isChrome
    }

    return false
  }

  function syncStandaloneState() {
    if (typeof window === 'undefined') {
      isStandaloneApp.value = false
      return
    }

    const standaloneNavigator = navigator as Navigator & { standalone?: boolean }
    const isStandaloneMatch =
      standaloneMediaQuery?.matches ??
      (typeof window.matchMedia === 'function'
        ? window.matchMedia('(display-mode: standalone)').matches
        : false)

    isStandaloneApp.value = Boolean(standaloneNavigator.standalone || isStandaloneMatch)
  }

  return {
    installInstruction,
    installHintDescription,
    needsNativeBrowser,
    recommendedBrowserLabel,
    showInstallStep,
    initializeInstallHint,
    removeInstallHintListeners,
  }
}
