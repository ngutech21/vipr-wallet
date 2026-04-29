import { defineStore } from 'pinia'

const STORAGE_PREFIX = 'vipr.appLock.'
const PIN_HASH_KEY = `${STORAGE_PREFIX}pinHash`
const PIN_SALT_KEY = `${STORAGE_PREFIX}pinSalt`
const PIN_ITERATIONS_KEY = `${STORAGE_PREFIX}pinIterations`
const BIOMETRIC_CREDENTIAL_ID_KEY = `${STORAGE_PREFIX}biometricCredentialId`
const BIOMETRIC_USER_ID_KEY = `${STORAGE_PREFIX}biometricUserId`

const PIN_MIN_LENGTH = 4
const PIN_MAX_LENGTH = 6
const PIN_ITERATIONS = 150_000
const LOCK_TIMEOUT_MS = 30_000
const HASH_BYTE_LENGTH = 32
const SALT_BYTE_LENGTH = 16

type AppLockState = {
  locked: boolean
  backgroundedAt: number | null
  pinHash: string | null
  pinSalt: string | null
  pinIterations: number
  biometricCredentialId: string | null
  biometricUserId: string | null
  lastError: string | null
}

function getStorageValue(key: string): string | null {
  if (typeof localStorage === 'undefined') {
    return null
  }

  return localStorage.getItem(key)
}

function setStorageValue(key: string, value: string): void {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.setItem(key, value)
}

function removeStorageValue(key: string): void {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.removeItem(key)
}

function getStoredIterations(): number {
  const value = Number(getStorageValue(PIN_ITERATIONS_KEY))
  return Number.isFinite(value) && value > 0 ? value : PIN_ITERATIONS
}

function getCrypto(): Crypto {
  if (typeof crypto === 'undefined' || crypto.subtle == null) {
    throw new Error('Secure crypto is not available')
  }

  return crypto
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

function validatePin(pin: string): void {
  if (pin.length < PIN_MIN_LENGTH || pin.length > PIN_MAX_LENGTH || !/^\d+$/.test(pin)) {
    throw new Error('PIN must be 4-6 digits')
  }
}

async function derivePinHash(pin: string, salt: Uint8Array, iterations: number): Promise<string> {
  const cryptoApi = getCrypto()
  const encodedPin = new TextEncoder().encode(pin)
  const keyMaterial = await cryptoApi.subtle.importKey('raw', encodedPin, 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await cryptoApi.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(salt),
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    HASH_BYTE_LENGTH * 8,
  )

  return bytesToBase64Url(new Uint8Array(bits))
}

function createChallenge(): ArrayBuffer {
  const challenge = new Uint8Array(32)
  getCrypto().getRandomValues(challenge)
  return toArrayBuffer(challenge)
}

function createRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  getCrypto().getRandomValues(bytes)
  return bytes
}

export const useAppLockStore = defineStore('app-lock', {
  state: (): AppLockState => {
    const pinHash = getStorageValue(PIN_HASH_KEY)
    const pinSalt = getStorageValue(PIN_SALT_KEY)

    return {
      locked: pinHash != null && pinSalt != null,
      backgroundedAt: null,
      pinHash,
      pinSalt,
      pinIterations: getStoredIterations(),
      biometricCredentialId: getStorageValue(BIOMETRIC_CREDENTIAL_ID_KEY),
      biometricUserId: getStorageValue(BIOMETRIC_USER_ID_KEY),
      lastError: null,
    }
  },

  getters: {
    isPinConfigured: (state) => state.pinHash != null && state.pinSalt != null,
    isBiometricEnabled: (state) => state.biometricCredentialId != null,
    shouldShowLock: (state) => state.pinHash != null && state.locked,
  },

  actions: {
    async setPin(pin: string): Promise<void> {
      validatePin(pin)

      const salt = createRandomBytes(SALT_BYTE_LENGTH)
      const hash = await derivePinHash(pin, salt, PIN_ITERATIONS)
      const encodedSalt = bytesToBase64Url(salt)

      this.pinHash = hash
      this.pinSalt = encodedSalt
      this.pinIterations = PIN_ITERATIONS
      this.locked = false
      this.lastError = null

      setStorageValue(PIN_HASH_KEY, hash)
      setStorageValue(PIN_SALT_KEY, encodedSalt)
      setStorageValue(PIN_ITERATIONS_KEY, String(PIN_ITERATIONS))
    },

    async verifyPin(pin: string): Promise<boolean> {
      if (!this.isPinConfigured || this.pinSalt == null || this.pinHash == null) {
        return false
      }

      try {
        validatePin(pin)
        const hash = await derivePinHash(pin, base64UrlToBytes(this.pinSalt), this.pinIterations)
        return hash === this.pinHash
      } catch {
        return false
      }
    },

    async unlockWithPin(pin: string): Promise<boolean> {
      const verified = await this.verifyPin(pin)
      if (!verified) {
        this.lastError = 'Incorrect PIN'
        return false
      }

      this.locked = false
      this.lastError = null
      return true
    },

    lock(): void {
      if (this.isPinConfigured) {
        this.locked = true
      }
    },

    markBackgrounded(now = Date.now()): void {
      if (this.isPinConfigured) {
        this.backgroundedAt = now
      }
    },

    handleVisible(now = Date.now()): void {
      if (this.backgroundedAt == null) {
        return
      }

      const elapsed = now - this.backgroundedAt
      this.backgroundedAt = null

      if (elapsed > LOCK_TIMEOUT_MS) {
        this.lock()
      }
    },

    removePin(): void {
      this.pinHash = null
      this.pinSalt = null
      this.pinIterations = PIN_ITERATIONS
      this.locked = false
      this.backgroundedAt = null
      this.lastError = null
      this.disableBiometric()

      removeStorageValue(PIN_HASH_KEY)
      removeStorageValue(PIN_SALT_KEY)
      removeStorageValue(PIN_ITERATIONS_KEY)
    },

    clearAll(): void {
      this.removePin()
    },

    async isBiometricAvailable(): Promise<boolean> {
      return (
        typeof navigator !== 'undefined' &&
        navigator.credentials != null &&
        typeof PublicKeyCredential !== 'undefined' &&
        typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function' &&
        (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
      )
    },

    async enableBiometric(): Promise<void> {
      if (!this.isPinConfigured) {
        throw new Error('Set a PIN before enabling Face ID / Touch ID')
      }

      if (!(await this.isBiometricAvailable())) {
        throw new Error('Face ID / Touch ID is not available on this device')
      }

      const userId = createRandomBytes(16)
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: createChallenge(),
          rp: { name: 'Vipr Wallet' },
          user: {
            id: toArrayBuffer(userId),
            name: 'vipr-local-user',
            displayName: 'Vipr Wallet',
          },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            residentKey: 'preferred',
            userVerification: 'required',
          },
          timeout: 60_000,
        },
      })

      if (!(credential instanceof PublicKeyCredential)) {
        throw new Error('Face ID / Touch ID setup was canceled')
      }

      const credentialId = bytesToBase64Url(new Uint8Array(credential.rawId))
      const encodedUserId = bytesToBase64Url(userId)

      this.biometricCredentialId = credentialId
      this.biometricUserId = encodedUserId

      setStorageValue(BIOMETRIC_CREDENTIAL_ID_KEY, credentialId)
      setStorageValue(BIOMETRIC_USER_ID_KEY, encodedUserId)
    },

    async unlockWithBiometric(): Promise<boolean> {
      if (!this.isBiometricEnabled || this.biometricCredentialId == null) {
        return false
      }

      try {
        const credential = await navigator.credentials.get({
          publicKey: {
            challenge: createChallenge(),
            allowCredentials: [
              {
                type: 'public-key',
                id: toArrayBuffer(base64UrlToBytes(this.biometricCredentialId)),
                transports: ['internal'],
              },
            ],
            userVerification: 'required',
            timeout: 60_000,
          },
        })

        if (!(credential instanceof PublicKeyCredential)) {
          return false
        }

        this.locked = false
        this.lastError = null
        return true
      } catch (error) {
        this.lastError = error instanceof Error ? error.message : 'Face ID / Touch ID failed'
        return false
      }
    },

    disableBiometric(): void {
      this.biometricCredentialId = null
      this.biometricUserId = null
      removeStorageValue(BIOMETRIC_CREDENTIAL_ID_KEY)
      removeStorageValue(BIOMETRIC_USER_ID_KEY)
    },
  },
})
