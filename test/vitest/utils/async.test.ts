import { afterEach, describe, expect, it, vi } from 'vitest'
import { raceWithTimeout, withTimeout } from 'src/utils/async'

describe('async utils', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolves before the timeout fires', async () => {
    await expect(withTimeout(Promise.resolve('done'), 100, 'work')).resolves.toBe('done')
  })

  it('rejects when an operation times out', async () => {
    vi.useFakeTimers()
    const result = withTimeout(new Promise<string>(() => {}), 100, 'work')
    const expectation = expect(result).rejects.toThrow('work timed out after 100ms')

    await vi.advanceTimersByTimeAsync(100)

    await expectation
  })

  it('returns the timeout value for non-throwing timeout races', async () => {
    vi.useFakeTimers()
    const timeoutValue = Symbol('timeout')
    const result = raceWithTimeout(new Promise<string>(() => {}), 100, timeoutValue)

    await vi.advanceTimersByTimeAsync(100)

    await expect(result).resolves.toBe(timeoutValue)
  })
})
