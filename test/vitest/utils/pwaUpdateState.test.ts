import { describe, expect, it } from 'vitest'
import {
  resolveApplyReadiness,
  resolveForegroundUpdateCheck,
  resolveResumeApplyIntent,
  resolveResumeApplyRegistration,
  resolveUpdateCheckReadiness,
  sanitizeApplyIntent,
  type ServiceWorkerRegistrationSnapshot,
} from 'src/utils/pwaUpdateState'

function createSnapshot(
  overrides: Partial<ServiceWorkerRegistrationSnapshot> = {},
): ServiceWorkerRegistrationSnapshot {
  return {
    hasRegistration: true,
    hasWaitingWorker: false,
    hasInstallingWorker: false,
    hasController: true,
    ...overrides,
  }
}

describe('pwa update state helpers', () => {
  it('sanitizes persisted apply intents', () => {
    expect(sanitizeApplyIntent({ version: 1, requestedAt: 10, attempts: 1 }, 1)).toEqual({
      version: 1,
      requestedAt: 10,
      attempts: 1,
    })
    expect(sanitizeApplyIntent({ version: 2, requestedAt: 10, attempts: 1 }, 1)).toBeNull()
    expect(sanitizeApplyIntent({ version: 1, requestedAt: 0, attempts: 1 }, 1)).toBeNull()
    expect(sanitizeApplyIntent({ version: 1, requestedAt: 10, attempts: 0 }, 1)).toBeNull()
  })

  it('resolves foreground check throttling without browser APIs', () => {
    expect(
      resolveForegroundUpdateCheck({
        hasServiceWorkerSupport: false,
        state: 'idle',
        isUpdateReady: false,
        lastForegroundCheckAt: 0,
        now: 100,
        minIntervalMs: 60,
      }),
    ).toBe('not-supported')

    expect(
      resolveForegroundUpdateCheck({
        hasServiceWorkerSupport: true,
        state: 'checking',
        isUpdateReady: false,
        lastForegroundCheckAt: 0,
        now: 100,
        minIntervalMs: 60,
      }),
    ).toBe('checking')

    expect(
      resolveForegroundUpdateCheck({
        hasServiceWorkerSupport: true,
        state: 'idle',
        isUpdateReady: true,
        lastForegroundCheckAt: 0,
        now: 100,
        minIntervalMs: 60,
      }),
    ).toBe('update-ready')

    expect(
      resolveForegroundUpdateCheck({
        hasServiceWorkerSupport: true,
        state: 'idle',
        isUpdateReady: false,
        lastForegroundCheckAt: 80,
        now: 100,
        minIntervalMs: 60,
      }),
    ).toBe('up-to-date')

    expect(
      resolveForegroundUpdateCheck({
        hasServiceWorkerSupport: true,
        state: 'idle',
        isUpdateReady: false,
        lastForegroundCheckAt: 0,
        now: 100,
        minIntervalMs: 60,
      }),
    ).toBe('run-check')
  })

  it('classifies update-check and apply readiness from registration snapshots', () => {
    expect(resolveUpdateCheckReadiness(createSnapshot({ hasRegistration: false }))).toBe(
      'not-registered',
    )
    expect(resolveUpdateCheckReadiness(createSnapshot({ hasWaitingWorker: true }))).toBe(
      'update-ready',
    )
    expect(
      resolveUpdateCheckReadiness(createSnapshot({ hasWaitingWorker: true, hasController: false })),
    ).toBe('up-to-date')
    expect(resolveUpdateCheckReadiness(createSnapshot({ hasInstallingWorker: true }))).toBe(
      'checking',
    )

    expect(resolveApplyReadiness(createSnapshot({ hasWaitingWorker: true }))).toBe('apply')
    expect(resolveApplyReadiness(createSnapshot({ hasInstallingWorker: true }))).toBe('checking')
    expect(resolveApplyReadiness(createSnapshot())).toBe('no-update')
  })

  it('resolves pending apply intent retries and cleanup', () => {
    expect(
      resolveResumeApplyIntent({
        intent: null,
        now: 100,
        maxAttempts: 2,
        ttlMs: 60,
      }),
    ).toEqual({ type: 'noop' })

    expect(
      resolveResumeApplyIntent({
        intent: { version: 1, requestedAt: 10, attempts: 2 },
        now: 20,
        maxAttempts: 2,
        ttlMs: 60,
      }),
    ).toEqual({ type: 'clear-intent' })

    expect(
      resolveResumeApplyIntent({
        intent: { version: 1, requestedAt: 10, attempts: 1 },
        now: 80,
        maxAttempts: 2,
        ttlMs: 60,
      }),
    ).toEqual({ type: 'clear-intent' })

    expect(
      resolveResumeApplyIntent({
        intent: { version: 1, requestedAt: 10, attempts: 1 },
        now: 20,
        maxAttempts: 2,
        ttlMs: 60,
      }),
    ).toEqual({
      type: 'retry',
      nextIntent: {
        version: 1,
        requestedAt: 20,
        attempts: 2,
      },
    })
  })

  it('only resumes apply when a waiting registration exists', () => {
    expect(resolveResumeApplyRegistration(createSnapshot({ hasRegistration: false }))).toBe(
      'clear-intent',
    )
    expect(resolveResumeApplyRegistration(createSnapshot())).toBe('clear-intent')
    expect(resolveResumeApplyRegistration(createSnapshot({ hasWaitingWorker: true }))).toBe('apply')
  })
})
