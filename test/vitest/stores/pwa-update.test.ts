import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePwaUpdateStore } from 'src/stores/pwa-update'

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
  })

  afterEach(() => {
    delete (navigator as unknown as Record<string, unknown>).serviceWorker
    vi.useRealTimers()
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

  it('returns checking without starting a second check when already checking', async () => {
    const registration = createRegistration()
    const serviceWorkerMock = installServiceWorkerMock(() => registration)
    const store = usePwaUpdateStore()
    store.onUpdateFound()

    const result = await store.checkForUpdatesManual()

    expect(result).toBe('checking')
    expect(serviceWorkerMock.getRegistration).not.toHaveBeenCalled()
  })

  it('keeps checking state while manual check is still in flight', async () => {
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
    await Promise.resolve()

    expect(store.state).toBe('checking')

    resolveUpdate?.()
    await checkPromise
    expect(store.state).toBe('idle')
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

  it('moves checking to idle when cached lifecycle event fires', () => {
    const registration = createRegistration()
    const store = usePwaUpdateStore()

    store.onUpdateFound()
    expect(store.state).toBe('checking')

    store.onCached(registration)

    expect(store.state).toBe('idle')
    expect(store.isUpdateReady).toBe(false)
  })

  it('keeps waiting when cached lifecycle event includes waiting worker', () => {
    const waitingWorker = {
      postMessage: vi.fn(),
    } as unknown as ServiceWorker
    const registration = createRegistration({ waiting: waitingWorker })
    const store = usePwaUpdateStore()

    store.onUpdateFound()
    store.onCached(registration)

    expect(store.state).toBe('waiting')
    expect(store.isUpdateReady).toBe(true)
  })

  it('moves checking to idle when offline event fires', () => {
    const store = usePwaUpdateStore()
    store.onUpdateFound()

    store.onOffline()

    expect(store.state).toBe('idle')
    expect(store.isUpdateReady).toBe(false)
  })

  it('allows apply update on /', async () => {
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
  })

  it('allows apply update on /settings/', async () => {
    const postMessage = vi.fn()
    const waitingWorker = {
      postMessage,
    } as unknown as ServiceWorker
    const registration = createRegistration({ waiting: waitingWorker })
    const serviceWorkerMock = installServiceWorkerMock(() => registration)
    const store = usePwaUpdateStore()
    store.reloadTriggered = true
    store.bindRegistration(registration)

    const applyPromise = store.applyUpdate('/settings/')
    await Promise.resolve()
    serviceWorkerMock.dispatchControllerChange()
    const result = await applyPromise

    expect(result).toBe('applied')
    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
  })

  it('waits for controllerchange before resolving apply update', async () => {
    const waitingWorker = {
      postMessage: vi.fn(),
    } as unknown as ServiceWorker
    const registration = createRegistration({ waiting: waitingWorker })
    const serviceWorkerMock = installServiceWorkerMock(() => registration)
    const store = usePwaUpdateStore()
    store.reloadTriggered = true
    store.bindRegistration(registration)

    let resolved = false
    const applyPromise = store.applyUpdate('/')
    const resolutionTracker = applyPromise.then(() => {
      resolved = true
    })

    await Promise.resolve()
    expect(store.state).toBe('applying')
    expect(resolved).toBe(false)

    serviceWorkerMock.dispatchControllerChange()
    const result = await applyPromise
    await resolutionTracker

    expect(result).toBe('applied')
    expect(resolved).toBe(true)
    expect(store.state).toBe('idle')
  })

  it('moves to error when controllerchange does not happen in time', async () => {
    vi.useFakeTimers()
    const waitingWorker = {
      postMessage: vi.fn(),
    } as unknown as ServiceWorker
    const registration = createRegistration({ waiting: waitingWorker })
    installServiceWorkerMock(() => registration)
    const store = usePwaUpdateStore()
    store.reloadTriggered = true
    store.bindRegistration(registration)

    const applyPromise = store.applyUpdate('/')
    await vi.advanceTimersByTimeAsync(10_000)
    const result = await applyPromise

    expect(result).toBe('error')
    expect(store.state).toBe('error')
    expect(store.lastError).toContain('Timed out waiting for service worker activation')
  })
})
