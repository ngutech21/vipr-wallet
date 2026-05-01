export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId != null) {
      clearTimeout(timeoutId)
    }
  }
}

export async function raceWithTimeout<T, TimeoutValue>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutValue: TimeoutValue,
): Promise<T | TimeoutValue> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<TimeoutValue>((resolve) => {
    timeoutId = setTimeout(() => resolve(timeoutValue), timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId != null) {
      clearTimeout(timeoutId)
    }
  }
}
