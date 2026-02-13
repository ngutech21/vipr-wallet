import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePwaUpdateStore } from 'src/stores/pwa-update'

const APPLY_INTENT_STORAGE_KEY = 'vipr.pwa.update.apply.intent'

type ServiceWorkerContainerMock = {
  dispatchControllerChange: () => void
  getRegistration: ReturnType<typeof vi.fn>
}

function installServiceWorkerMock(
  getRegistrationValue: () => ServiceWorkerRegistration | undefined,
): ServiceWorkerContainerMock {
  const target = new EventTarget()
  const getRegistration = vi.fn(() => Promise.resolve(getRegistrationValue()))

  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      controller: {} as ServiceWorker,
      getRegistration,
      addEventListener: target.addEventListener.bind(target),
      removeEventListener: target.removeEventListener.bind(target),
    } satisfies Partial<ServiceWorkerContainer>,
  })

  return {
    dispatchControllerChange: () => {
      target.dispatchEvent(new Event('controllerchange'))
    },
    getRegistration,
  }
}

function createRegistration(
  overrides: Partial<ServiceWorkerRegistration> = {},
): ServiceWorkerRegistration {
  return {
    update: vi.fn().mockResolvedValue(undefined) as unknown as ServiceWorkerRegistration['update'],
    waiting: null,
    installing: null,
    ...overrides,
  } as ServiceWorkerRegistration
}

describe('pwa update store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    window.localStorage.clear()
  })

  afterEach(() => {
    delete (navigator as unknown as Record<string, unknown>).serviceWorker
    vi.useRealTimers()
    window.localStorage.clear()
  })

  it('moves to waiting when updated hook receives waiting worker', () => {
    const waitingWorker = {
      postMessage: vi.fn(),
    } as unknown as ServiceWorker
    const registration = createRegistration({ waiting: waitingWorker })
    const store = usePwaUpdateStore()

    store.onUpdated(registration)

    expect(store.state).toBe('waiting')
    expect(store.isUpdateReady).toBe(true)
    expect(store.registration).toStrictEqual(registration)
  })

  it('manual check enters checking and exits cleanly when up to date', async () => {
    let resolveUpdate: (() => void) | undefined
    const updatePromise = new Promise<void>((resolve) => {
      resolveUpdate = resolve
    })
    const registration = createRegistration({
      update: vi.fn(() => updatePromise) as unknown as ServiceWorkerRegistration['update'],
    })
    installServiceWorkerMock(() => registration)
    const store = usePwaUpdateStore()

    const checkPromise = store.checkForUpdatesManual()
    expect(store.state).toBe('checking')

    resolveUpdate?.()
    const result = await checkPromise

    expect(result).toBe('up-to-date')
    expect(store.state).toBe('idle')
  })

  it('startup check does not auto-apply when update is waiting', async () => {
    const postMessage = vi.fn()
    const waitingWorker = {
      postMessage,
    } as unknown as ServiceWorker
    const registration = createRegistration({ waiting: waitingWorker })
    installServiceWorkerMock(() => registration)
    const store = usePwaUpdateStore()
    store.bindRegistration(registration)

    const result = await store.checkForUpdatesStartup()

    expect(result).toBe('update-ready')
    expect(postMessage).not.toHaveBeenCalled()
  })

  it('throttles foreground checks', async () => {
    const registration = createRegistration()
    const serviceWorkerMock = installServiceWorkerMock(() => registration)
    const store = usePwaUpdateStore()

    const firstResult = await store.checkForUpdatesForeground()
    const callsAfterFirst = serviceWorkerMock.getRegistration.mock.calls.length
    const secondResult = await store.checkForUpdatesForeground()

    expect(firstResult).toBe('up-to-date')
    expect(secondResult).toBe('up-to-date')
    expect(serviceWorkerMock.getRegistration).toHaveBeenCalledTimes(callsAfterFirst)
  })

  it('blocks apply update on non-allowlisted routes', async () => {
    const postMessage = vi.fn()
    const waitingWorker = {
      postMessage,
    } as unknown as ServiceWorker
    const registration = createRegistration({ waiting: waitingWorker })
    installServiceWorkerMock(() => registration)
    const store = usePwaUpdateStore()
    store.bindRegistration(registration)

    const result = await store.applyUpdate('/send')

    expect(result).toBe('blocked-route')
    expect(postMessage).not.toHaveBeenCalled()
  })

  it('applies update on safe route and clears apply intent', async () => {
    const postMessage = vi.fn()
    const waitingWorker = {
      postMessage,
    } as unknown as ServiceWorker
    const registration = createRegistration({ waiting: waitingWorker })
    const serviceWorkerMock = installServiceWorkerMock(() => registration)
    const store = usePwaUpdateStore()
    store.reloadTriggered = true
    store.bindRegistration(registration)

    const applyPromise = store.applyUpdate('/')
    await Promise.resolve()
    serviceWorkerMock.dispatchControllerChange()
    const result = await applyPromise

    expect(result).toBe('applied')
    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
    expect(window.localStorage.getItem(APPLY_INTENT_STORAGE_KEY)).toBeNull()
  })

  it('forces reload on apply timeout and preserves apply intent for resume', async () => {
    vi.useFakeTimers()
    const waitingWorker = {
      postMessage: vi.fn(),
    } as unknown as ServiceWorker
    const registration = createRegistration({ waiting: waitingWorker })
    installServiceWorkerMock(() => registration)
    const store = usePwaUpdateStore()
    store.bindRegistration(registration)

    const applyPromise = store.applyUpdate('/')
    await vi.advanceTimersByTimeAsync(10_000)
    const result = await applyPromise

    const intentRaw = window.localStorage.getItem(APPLY_INTENT_STORAGE_KEY)
    const intent = intentRaw == null ? null : (JSON.parse(intentRaw) as { attempts: number })

    expect(result).toBe('error')
    expect(store.state).toBe('error')
    expect(store.reloadTriggered).toBe(true)
    expect(intent?.attempts).toBe(1)
  })

  it('auto-resumes pending apply on safe route', async () => {
    const postMessage = vi.fn()
    const waitingWorker = {
      postMessage,
    } as unknown as ServiceWorker
    const registration = createRegistration({ waiting: waitingWorker })
    const serviceWorkerMock = installServiceWorkerMock(() => registration)
    const store = usePwaUpdateStore()
    store.reloadTriggered = true

    window.localStorage.setItem(
      APPLY_INTENT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        requestedAt: Date.now(),
        attempts: 1,
      }),
    )

    const resumePromise = store.resumePendingApplyIfAny('/')
    await Promise.resolve()
    serviceWorkerMock.dispatchControllerChange()
    await resumePromise

    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
    expect(window.localStorage.getItem(APPLY_INTENT_STORAGE_KEY)).toBeNull()
  })

  it('clears intent when pending resume has no waiting worker', async () => {
    const registration = createRegistration()
    installServiceWorkerMock(() => registration)
    const store = usePwaUpdateStore()

    window.localStorage.setItem(
      APPLY_INTENT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        requestedAt: Date.now(),
        attempts: 1,
      }),
    )

    await store.resumePendingApplyIfAny('/')

    expect(window.localStorage.getItem(APPLY_INTENT_STORAGE_KEY)).toBeNull()
  })

  it('clears stale or over-attempted intents during resume', async () => {
    const registration = createRegistration({
      waiting: { postMessage: vi.fn() } as unknown as ServiceWorker,
    })
    installServiceWorkerMock(() => registration)
    const store = usePwaUpdateStore()

    window.localStorage.setItem(
      APPLY_INTENT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        requestedAt: Date.now(),
        attempts: 2,
      }),
    )
    await store.resumePendingApplyIfAny('/')
    expect(window.localStorage.getItem(APPLY_INTENT_STORAGE_KEY)).toBeNull()

    window.localStorage.setItem(
      APPLY_INTENT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        requestedAt: Date.now() - 6 * 60_000,
        attempts: 1,
      }),
    )
    await store.resumePendingApplyIfAny('/')
    expect(window.localStorage.getItem(APPLY_INTENT_STORAGE_KEY)).toBeNull()
  })
})
