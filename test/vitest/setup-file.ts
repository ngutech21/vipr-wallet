// This file will be run before each test file
/* eslint-disable no-console */
import { beforeEach, afterEach, vi } from 'vitest'
import { Buffer } from 'buffer'

// Make Buffer available globally for tests that need it
globalThis.Buffer = Buffer

// Mock the logger to prevent console noise during tests
vi.mock('src/services/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    success: vi.fn(),
    logWalletOperation: vi.fn(),
    logTransaction: vi.fn(),
    logFederation: vi.fn(),
    logLightning: vi.fn(),
    wallet: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    },
    transaction: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    },
    federation: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    },
    lightning: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    },
    nostr: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    },
    scanner: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    },
    pwa: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    },
    ui: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    },
  },
}))

type ConsoleLevel = 'warn' | 'error'
type ConsoleMessage = {
  level: ConsoleLevel
  text: string
}

let originalWarn: typeof console.warn
let originalError: typeof console.error
let consoleMessages: ConsoleMessage[] = []

const IGNORED_CONSOLE_PATTERNS: RegExp[] = []

function toConsoleText(arg: unknown): string {
  if (arg instanceof Error) {
    return arg.stack ?? arg.message
  }

  if (typeof arg === 'string') {
    return arg
  }

  try {
    return JSON.stringify(arg)
  } catch {
    return String(arg)
  }
}

beforeEach(() => {
  consoleMessages = []
  originalWarn = console.warn
  originalError = console.error

  console.warn = (...args: unknown[]) => {
    consoleMessages.push({
      level: 'warn',
      text: args.map((arg) => toConsoleText(arg)).join(' '),
    })
  }

  console.error = (...args: unknown[]) => {
    consoleMessages.push({
      level: 'error',
      text: args.map((arg) => toConsoleText(arg)).join(' '),
    })
  }
})

afterEach(() => {
  console.warn = originalWarn
  console.error = originalError

  const unexpectedMessages = consoleMessages.filter(({ text }) => {
    return !IGNORED_CONSOLE_PATTERNS.some((pattern) => pattern.test(text))
  })

  if (unexpectedMessages.length === 0) {
    return
  }

  const formatted = unexpectedMessages.map(({ level, text }) => `- [${level}] ${text}`).join('\n')

  throw new Error(`Unexpected console warnings/errors in test:\n${formatted}`)
})
