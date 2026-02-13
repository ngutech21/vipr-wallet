import { defineStore } from 'pinia'
import { logger } from 'src/services/logger'

const UPDATE_APPLY_ALLOWLIST = new Set(['/', '/settings/'])
const CONTROLLER_CHANGE_TIMEOUT_MS = 10_000
const FOREGROUND_CHECK_MIN_INTERVAL_MS = 60_000
const APPLY_INTENT_STORAGE_KEY = 'vipr.pwa.update.apply.intent'
const APPLY_INTENT_VERSION = 1
const APPLY_INTENT_MAX_ATTEMPTS = 2
const APPLY_INTENT_TTL_MS = 5 * 60_000

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
  | 'checking'
  | 'no-update'
  | 'not-supported'
  | 'error'

type ApplyIntentState = {
  version: typeof APPLY_INTENT_VERSION
  requestedAt: number
  attempts: number
}

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

function hasActiveServiceWorkerController(): boolean {
  return hasServiceWorkerSupport() && navigator.serviceWorker.controller != null
}

function hasLocalStorageSupport(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function sanitizeApplyIntent(value: unknown): ApplyIntentState | null {
  if (value == null || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  const version = record.version
  const requestedAt = record.requestedAt
  const attempts = record.attempts

  if (version !== APPLY_INTENT_VERSION) {
    return null
  }
  if (
    typeof requestedAt !== 'number' ||
    Number.isFinite(requestedAt) === false ||
    requestedAt <= 0
  ) {
    return null
  }
  if (typeof attempts !== 'number' || Number.isInteger(attempts) === false || attempts < 1) {
    return null
  }

  return {
    version: APPLY_INTENT_VERSION,
    requestedAt,
    attempts,
  }
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
    lastForegroundCheckAt: 0,
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

    setError(error: unknown, context: string, clearUpdateReady = true) {
      const message = getErrorMessage(error)
      this.lastError = message
      if (clearUpdateReady) {
        this.isUpdateReady = false
      }
      this.setState('error')
      logger.pwa.error(`PWA update error (${context})`, error)
    },

    readApplyIntent(): ApplyIntentState | null {
      if (!hasLocalStorageSupport()) {
        return null
      }

      try {
        const raw = window.localStorage.getItem(APPLY_INTENT_STORAGE_KEY)
        if (raw == null) {
          return null
        }

        const sanitized = sanitizeApplyIntent(JSON.parse(raw))
        if (sanitized != null) {
          return sanitized
        }

        window.localStorage.removeItem(APPLY_INTENT_STORAGE_KEY)
        return null
      } catch {
        return null
      }
    },

    writeApplyIntent(intent: ApplyIntentState) {
      if (!hasLocalStorageSupport()) {
        return
      }

      try {
        window.localStorage.setItem(APPLY_INTENT_STORAGE_KEY, JSON.stringify(intent))
      } catch {
        // Ignore localStorage write failures
      }
    },

    clearApplyIntent() {
      if (!hasLocalStorageSupport()) {
        return
      }

      try {
        window.localStorage.removeItem(APPLY_INTENT_STORAGE_KEY)
      } catch {
        // Ignore localStorage remove failures
      }
    },

    forceReloadOnce(reason: string) {
      if (this.reloadTriggered || typeof window === 'undefined') {
        return
      }
      this.reloadTriggered = true
      logger.pwa.warn('Reloading app for service worker update', { reason })
      try {
        window.location.reload()
      } catch (error) {
        logger.pwa.warn('Failed to reload app after service worker update', { error, reason })
      }
    },

    isApplyIntentExpired(intent: ApplyIntentState): boolean {
      return Date.now() - intent.requestedAt > APPLY_INTENT_TTL_MS
    },

    bindRegistration(registration: ServiceWorkerRegistration) {
      this.registration = registration
      if (registration.waiting != null) {
        this.onUpdated(registration)
      }
    },

    onUpdateFound() {
      this.lastError = null
      this.isUpdateReady = false
      this.setState('checking')
    },

    onCached(registration: ServiceWorkerRegistration) {
      this.registration = registration
      this.lastError = null
      this.isUpdateReady = registration.waiting != null && hasActiveServiceWorkerController()

      if (this.isUpdateReady) {
        this.setState('waiting')
      } else if (this.state === 'checking') {
        this.setState('idle')
      }
    },

    onOffline() {
      if (this.state === 'checking') {
        this.isUpdateReady = false
        this.setState('idle')
      }
    },

    onUpdated(registration: ServiceWorkerRegistration) {
      this.registration = registration
      this.lastError = null
      this.isUpdateReady = registration.waiting != null && hasActiveServiceWorkerController()

      if (this.isUpdateReady) {
        this.setState('waiting')
      } else if (this.state === 'checking') {
        this.setState('idle')
      }
    },

    async checkForUpdatesManual(): Promise<UpdateCheckResult> {
      return await this.runCheck()
    },

    async checkForUpdatesStartup(): Promise<UpdateCheckResult> {
      return await this.runCheck()
    },

    async checkForUpdatesForeground(): Promise<UpdateCheckResult> {
      if (!hasServiceWorkerSupport()) {
        this.setState('idle')
        this.isUpdateReady = false
        return 'not-supported'
      }

      if (this.state === 'checking') {
        return 'checking'
      }

      if (this.isUpdateReady) {
        return 'update-ready'
      }

      const now = Date.now()
      if (now - this.lastForegroundCheckAt < FOREGROUND_CHECK_MIN_INTERVAL_MS) {
        return 'up-to-date'
      }

      this.lastForegroundCheckAt = now
      return await this.runCheck()
    },

    async runCheck(): Promise<UpdateCheckResult> {
      if (!hasServiceWorkerSupport()) {
        this.setState('idle')
        this.isUpdateReady = false
        return 'not-supported'
      }

      if (this.state === 'checking') {
        return 'checking'
      }

      if (this.registration?.waiting != null && hasActiveServiceWorkerController()) {
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
        if (registration.waiting != null && hasActiveServiceWorkerController()) {
          return 'update-ready'
        }

        await registration.update()

        const latestRegistration = (await navigator.serviceWorker.getRegistration()) ?? registration
        this.bindRegistration(latestRegistration)

        if (latestRegistration.waiting != null && hasActiveServiceWorkerController()) {
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

      this.writeApplyIntent({
        version: APPLY_INTENT_VERSION,
        requestedAt: Date.now(),
        attempts: 1,
      })
      return await this.applyUpdateInternal()
    },

    async applyUpdateInternal(): Promise<ApplyUpdateResult> {
      if (!hasServiceWorkerSupport()) {
        this.clearApplyIntent()
        return 'not-supported'
      }

      this.lastError = null

      const registration =
        this.registration ?? (await navigator.serviceWorker.getRegistration()) ?? null
      if (registration == null) {
        this.registration = registration
        this.isUpdateReady = false
        this.setState('idle')
        this.clearApplyIntent()
        return 'no-update'
      }

      let latestRegistration = registration
      if (latestRegistration.waiting == null) {
        this.registration = latestRegistration
        this.setState('checking')

        try {
          await latestRegistration.update()
        } catch (error) {
          this.setError(error, 'apply-check', false)
          this.forceReloadOnce('apply-check-failed')
          return 'error'
        }

        latestRegistration = (await navigator.serviceWorker.getRegistration()) ?? latestRegistration
        this.bindRegistration(latestRegistration)

        if (latestRegistration.waiting == null) {
          this.isUpdateReady = false
          if (latestRegistration.installing != null) {
            this.setState('checking')
            return 'checking'
          }
          this.setState('idle')
          this.clearApplyIntent()
          return 'no-update'
        }
      }

      this.registration = latestRegistration
      this.setState('applying')

      try {
        const waitingWorker = latestRegistration.waiting
        if (waitingWorker == null) {
          this.isUpdateReady = false
          this.setState('checking')
          return 'checking'
        }

        const controllerChangePromise = waitForControllerChange()
        waitingWorker.postMessage({ type: 'SKIP_WAITING' })
        await controllerChangePromise

        this.isUpdateReady = false
        this.setState('idle')
        this.clearApplyIntent()

        this.forceReloadOnce('apply-success')

        return 'applied'
      } catch (error) {
        this.setError(error, 'apply', false)
        this.forceReloadOnce('apply-fallback')
        return 'error'
      }
    },

    async resumePendingApplyIfAny(routeName: unknown): Promise<void> {
      if (!this.canApplyOnRoute(routeName)) {
        return
      }

      if (!hasServiceWorkerSupport()) {
        this.clearApplyIntent()
        return
      }

      const intent = this.readApplyIntent()
      if (intent == null) {
        return
      }

      if (intent.attempts >= APPLY_INTENT_MAX_ATTEMPTS || this.isApplyIntentExpired(intent)) {
        this.clearApplyIntent()
        return
      }

      const nextIntent: ApplyIntentState = {
        version: APPLY_INTENT_VERSION,
        requestedAt: Date.now(),
        attempts: intent.attempts + 1,
      }
      this.writeApplyIntent(nextIntent)

      const registration =
        this.registration ?? (await navigator.serviceWorker.getRegistration()) ?? null
      if (registration == null) {
        this.clearApplyIntent()
        return
      }

      this.bindRegistration(registration)
      if (registration.waiting == null) {
        this.clearApplyIntent()
        return
      }

      await this.applyUpdateInternal()
    },
  },
})
