import { defineStore } from 'pinia'
import { logger } from 'src/services/logger'

const UPDATE_APPLY_ALLOWLIST = new Set(['/', '/settings/'])
const CONTROLLER_CHANGE_TIMEOUT_MS = 10_000

export type PwaUpdateState = 'idle' | 'checking' | 'waiting' | 'applying' | 'error'

export type UpdateCheckResult =
  | 'update-ready'
  | 'up-to-date'
  | 'checking'
  | 'not-supported'
  | 'not-registered'
  | 'error'

export type ApplyUpdateResult =
  | 'applied'
  | 'blocked-route'
  | 'no-update'
  | 'not-supported'
  | 'error'

function routeNameToString(routeName: unknown): string {
  if (typeof routeName === 'string') {
    return routeName
  }
  return ''
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

function hasServiceWorkerSupport(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator
}

function waitForControllerChange(): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutRef: { id: number | ReturnType<typeof setTimeout> | null } = { id: null }
    let onControllerChange: (() => void) | null = null

    const cleanup = () => {
      if (timeoutRef.id != null) {
        clearTimeout(timeoutRef.id)
      }
      if (onControllerChange != null) {
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      }
    }

    onControllerChange = () => {
      cleanup()
      resolve()
    }

    timeoutRef.id = window.setTimeout(() => {
      cleanup()
      reject(new Error('Timed out waiting for service worker activation'))
    }, CONTROLLER_CHANGE_TIMEOUT_MS)

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
  })
}

export const usePwaUpdateStore = defineStore('pwaUpdate', {
  state: () => ({
    state: 'idle' as PwaUpdateState,
    registration: null as ServiceWorkerRegistration | null,
    lastError: null as string | null,
    isUpdateReady: false,
    reloadTriggered: false,
  }),

  getters: {
    canApplyOnRoute:
      () =>
      (routeName: unknown): boolean => {
        return UPDATE_APPLY_ALLOWLIST.has(routeNameToString(routeName))
      },
  },

  actions: {
    setState(nextState: PwaUpdateState) {
      if (this.state !== nextState) {
        logger.pwa.debug('PWA update state transition', { from: this.state, to: nextState })
        this.state = nextState
      }
    },

    setError(error: unknown, context: string) {
      const message = getErrorMessage(error)
      this.lastError = message
      this.isUpdateReady = false
      this.setState('error')
      logger.pwa.error(`PWA update error (${context})`, error)
    },

    bindRegistration(registration: ServiceWorkerRegistration) {
      this.registration = registration
      if (registration.waiting != null) {
        this.onUpdated(registration)
        return
      }

      if (this.state === 'checking') {
        this.isUpdateReady = false
        this.setState('idle')
      }
    },

    onUpdateFound() {
      this.lastError = null
      this.isUpdateReady = false
      this.setState('checking')
    },

    onUpdated(registration: ServiceWorkerRegistration) {
      this.registration = registration
      this.lastError = null
      this.isUpdateReady = registration.waiting != null

      if (this.isUpdateReady) {
        this.setState('waiting')
      } else if (this.state === 'checking') {
        this.setState('idle')
      }
    },

    async checkForUpdatesManual(): Promise<UpdateCheckResult> {
      return await this.runCheck()
    },

    async checkForUpdatesStartup(): Promise<void> {
      await this.runCheck()
    },

    async runCheck(): Promise<UpdateCheckResult> {
      if (!hasServiceWorkerSupport()) {
        this.setState('idle')
        this.isUpdateReady = false
        return 'not-supported'
      }

      if (this.registration?.waiting != null) {
        this.onUpdated(this.registration)
        return 'update-ready'
      }

      this.lastError = null
      this.isUpdateReady = false
      this.setState('checking')

      try {
        const registration =
          this.registration ?? (await navigator.serviceWorker.getRegistration()) ?? null

        if (registration == null) {
          this.setState('idle')
          return 'not-registered'
        }

        this.bindRegistration(registration)
        await registration.update()

        const latestRegistration = (await navigator.serviceWorker.getRegistration()) ?? registration
        this.bindRegistration(latestRegistration)

        if (latestRegistration.waiting != null) {
          return 'update-ready'
        }

        if (latestRegistration.installing != null) {
          this.setState('checking')
          return 'checking'
        }

        this.setState('idle')
        return 'up-to-date'
      } catch (error) {
        this.setError(error, 'check')
        return 'error'
      }
    },

    async applyUpdate(routeName: unknown): Promise<ApplyUpdateResult> {
      if (!this.canApplyOnRoute(routeName)) {
        return 'blocked-route'
      }

      if (!hasServiceWorkerSupport()) {
        return 'not-supported'
      }

      this.lastError = null

      const registration =
        this.registration ?? (await navigator.serviceWorker.getRegistration()) ?? null
      if (registration == null || registration.waiting == null) {
        this.registration = registration
        this.isUpdateReady = false
        this.setState('idle')
        return 'no-update'
      }

      this.registration = registration
      this.setState('applying')

      try {
        const controllerChangePromise = waitForControllerChange()
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
        await controllerChangePromise

        this.isUpdateReady = false
        this.setState('idle')

        if (!this.reloadTriggered) {
          this.reloadTriggered = true
          window.location.reload()
        }

        return 'applied'
      } catch (error) {
        this.setError(error, 'apply')
        return 'error'
      }
    },
  },
})
