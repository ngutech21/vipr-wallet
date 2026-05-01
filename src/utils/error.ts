export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  if (error != null && typeof error === 'object' && !Array.isArray(error)) {
    const details = error as { message?: unknown; error?: unknown }
    if (typeof details.message === 'string' && details.message !== '') {
      return details.message
    }
    if (typeof details.error === 'string' && details.error !== '') {
      return details.error
    }

    try {
      return JSON.stringify(error)
    } catch {
      return Object.prototype.toString.call(error)
    }
  }

  return String(error)
}
