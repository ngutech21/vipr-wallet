export function getQueryString(value: unknown): string | null {
  const firstValue = Array.isArray(value) ? value[0] : value
  return typeof firstValue === 'string' ? firstValue : null
}

export function getQueryStringOrEmpty(value: unknown): string {
  return getQueryString(value) ?? ''
}

export function getQueryInteger(value: unknown, fallback = 0): number {
  const rawValue = getQueryString(value)
  if (rawValue == null) {
    return fallback
  }

  const parsed = Number.parseInt(rawValue, 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

export function getPositiveQueryInteger(value: unknown): number | null {
  const parsed = getQueryInteger(value, 0)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}
