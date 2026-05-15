export type ApplyIntentState = {
  version: number
  requestedAt: number
  attempts: number
}

export type PwaUpdateLifecycleState = 'idle' | 'checking' | 'waiting' | 'applying' | 'error'

export type ServiceWorkerRegistrationSnapshot = {
  hasRegistration: boolean
  hasWaitingWorker: boolean
  hasInstallingWorker: boolean
  hasController: boolean
}

export type ForegroundUpdateCheckDecision =
  | 'not-supported'
  | 'checking'
  | 'update-ready'
  | 'up-to-date'
  | 'run-check'

export type UpdateCheckReadinessDecision =
  | 'not-registered'
  | 'update-ready'
  | 'checking'
  | 'up-to-date'

export type ApplyReadinessDecision = 'apply' | 'checking' | 'no-update'

export type ResumeApplyIntentDecision =
  | {
      type: 'noop'
    }
  | {
      type: 'clear-intent'
    }
  | {
      type: 'retry'
      nextIntent: ApplyIntentState
    }

export type ResumeApplyRegistrationDecision = 'apply' | 'clear-intent'

export function sanitizeApplyIntent(
  value: unknown,
  expectedVersion: number,
): ApplyIntentState | null {
  if (value == null || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  const version = record.version
  const requestedAt = record.requestedAt
  const attempts = record.attempts

  if (version !== expectedVersion) {
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
    version: expectedVersion,
    requestedAt,
    attempts,
  }
}

export function snapshotServiceWorkerRegistration(
  registration: ServiceWorkerRegistration | null,
  hasController: boolean,
): ServiceWorkerRegistrationSnapshot {
  return {
    hasRegistration: registration != null,
    hasWaitingWorker: registration?.waiting != null,
    hasInstallingWorker: registration?.installing != null,
    hasController,
  }
}

export function resolveForegroundUpdateCheck({
  hasServiceWorkerSupport,
  state,
  isUpdateReady,
  lastForegroundCheckAt,
  now,
  minIntervalMs,
}: {
  hasServiceWorkerSupport: boolean
  state: PwaUpdateLifecycleState
  isUpdateReady: boolean
  lastForegroundCheckAt: number
  now: number
  minIntervalMs: number
}): ForegroundUpdateCheckDecision {
  if (!hasServiceWorkerSupport) {
    return 'not-supported'
  }

  if (state === 'checking') {
    return 'checking'
  }

  if (isUpdateReady) {
    return 'update-ready'
  }

  if (now - lastForegroundCheckAt < minIntervalMs) {
    return 'up-to-date'
  }

  return 'run-check'
}

export function resolveUpdateCheckReadiness(
  snapshot: ServiceWorkerRegistrationSnapshot,
): UpdateCheckReadinessDecision {
  if (!snapshot.hasRegistration) {
    return 'not-registered'
  }

  if (snapshot.hasWaitingWorker && snapshot.hasController) {
    return 'update-ready'
  }

  if (snapshot.hasInstallingWorker) {
    return 'checking'
  }

  return 'up-to-date'
}

export function resolveApplyReadiness(
  snapshot: ServiceWorkerRegistrationSnapshot,
): ApplyReadinessDecision {
  if (snapshot.hasWaitingWorker) {
    return 'apply'
  }

  if (snapshot.hasInstallingWorker) {
    return 'checking'
  }

  return 'no-update'
}

export function resolveResumeApplyIntent({
  intent,
  now,
  maxAttempts,
  ttlMs,
}: {
  intent: ApplyIntentState | null
  now: number
  maxAttempts: number
  ttlMs: number
}): ResumeApplyIntentDecision {
  if (intent == null) {
    return {
      type: 'noop',
    }
  }

  if (intent.attempts >= maxAttempts || now - intent.requestedAt > ttlMs) {
    return {
      type: 'clear-intent',
    }
  }

  return {
    type: 'retry',
    nextIntent: {
      version: intent.version,
      requestedAt: now,
      attempts: intent.attempts + 1,
    },
  }
}

export function resolveResumeApplyRegistration(
  snapshot: ServiceWorkerRegistrationSnapshot,
): ResumeApplyRegistrationDecision {
  return snapshot.hasRegistration && snapshot.hasWaitingWorker ? 'apply' : 'clear-intent'
}
