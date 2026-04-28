import { webcrypto } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useAppLockStore } from 'src/stores/app-lock'

describe('app-lock store', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'crypto', {
      value: webcrypto,
      configurable: true,
    })
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('stores a hashed PIN and unlocks only with the correct PIN', async () => {
    const store = useAppLockStore()

    await store.setPin('123456')
    store.lock()

    expect(store.isPinConfigured).toBe(true)
    expect(store.shouldShowLock).toBe(true)
    expect(localStorage.getItem('vipr.appLock.pinHash')).not.toBe('123456')

    await expect(store.unlockWithPin('111111')).resolves.toBe(false)
    expect(store.shouldShowLock).toBe(true)

    await expect(store.unlockWithPin('123456')).resolves.toBe(true)
    expect(store.shouldShowLock).toBe(false)
  })

  it('removing the PIN disables biometric unlock metadata', async () => {
    const store = useAppLockStore()

    await store.setPin('1234')
    store.biometricCredentialId = 'credential-id'
    store.biometricUserId = 'user-id'
    localStorage.setItem('vipr.appLock.biometricCredentialId', 'credential-id')
    localStorage.setItem('vipr.appLock.biometricUserId', 'user-id')

    store.removePin()

    expect(store.isPinConfigured).toBe(false)
    expect(store.isBiometricEnabled).toBe(false)
    expect(localStorage.getItem('vipr.appLock.biometricCredentialId')).toBeNull()
    expect(localStorage.getItem('vipr.appLock.biometricUserId')).toBeNull()
  })

  it('locks on resume only after the 30 second timeout', async () => {
    const store = useAppLockStore()

    await store.setPin('1234')
    store.markBackgrounded(1_000)
    store.handleVisible(30_999)

    expect(store.shouldShowLock).toBe(false)

    store.markBackgrounded(1_000)
    store.handleVisible(31_001)

    expect(store.shouldShowLock).toBe(true)
  })

  it('starts locked when a PIN is already configured in storage', async () => {
    const firstStore = useAppLockStore()
    await firstStore.setPin('1234')

    setActivePinia(createPinia())
    const restoredStore = useAppLockStore()

    expect(restoredStore.isPinConfigured).toBe(true)
    expect(restoredStore.shouldShowLock).toBe(true)
  })

  it('enables and uses biometric unlock through WebAuthn', async () => {
    const rawId = new Uint8Array([1, 2, 3, 4]).buffer
    class MockPublicKeyCredential {
      rawId: ArrayBuffer

      constructor() {
        this.rawId = rawId
      }
    }
    Object.defineProperty(globalThis, 'PublicKeyCredential', {
      value: Object.assign(MockPublicKeyCredential, {
        isUserVerifyingPlatformAuthenticatorAvailable: vi.fn(() => Promise.resolve(true)),
      }),
      configurable: true,
    })
    const credentialsMock = {
      create: vi.fn(() => Promise.resolve(new MockPublicKeyCredential())),
      get: vi.fn(() => Promise.resolve(new MockPublicKeyCredential())),
    }
    Object.defineProperty(navigator, 'credentials', {
      value: credentialsMock,
      configurable: true,
    })
    const store = useAppLockStore()

    await store.setPin('1234')
    await store.enableBiometric()
    store.lock()

    expect(store.isBiometricEnabled).toBe(true)
    await expect(store.unlockWithBiometric()).resolves.toBe(true)
    expect(store.shouldShowLock).toBe(false)
    expect(credentialsMock.create).toHaveBeenCalledTimes(1)
    expect(credentialsMock.get).toHaveBeenCalledTimes(1)
  })
})
