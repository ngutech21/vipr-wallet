import type { JSONObject, JSONValue, MetaConsensusValue } from '@fedimint/core'

export type FederationMetadataSource = 'config' | 'legacy' | 'metaModule'

export type FederationMetadataRawSources = Partial<Record<FederationMetadataSource, JSONObject>>

export type ResolvedFederationMetadata = {
  federationName?: string
  welcomeMessage?: string
  defaultCurrency?: string
  iconUrl?: string
  maxBalanceMsats?: number
  maxInvoiceMsats?: number
  tosUrl?: string
  inviteCode?: string
  previewMessage?: string
  popupEndTimestamp?: number
  popupCountdownMessage?: string
  isPublic?: boolean
  vettedGateways?: string[]
  recurringdApi?: string
  lnaddressApi?: string
  federationExpiryTimestamp?: number
  federationSuccessor?: string
  rawSources?: FederationMetadataRawSources
}

export type FederationConfigMetadata = {
  federation_name?: string
  meta_external_url?: string
}

export type ResolveFederationMetadataOptions = {
  config?: JSONObject | FederationConfigMetadata | null
  legacy?: JSONObject | ResolvedFederationMetadata | null
  metaModule?: MetaConsensusValue<JSONObject> | JSONObject | null
  includeRawSources?: boolean
}

export function resolveFederationMetadata(
  options: ResolveFederationMetadataOptions,
): ResolvedFederationMetadata {
  const rawSources: FederationMetadataRawSources = {}
  const configRaw = toJSONObject(options.config)
  const legacyRaw = toJSONObject(options.legacy)
  const metaModuleRaw = toJSONObject(extractMetaModuleValue(options.metaModule))

  const resolved = mergeResolvedMetadata(
    normalizeRawMetadata(configRaw),
    normalizeRawMetadata(legacyRaw),
    normalizeRawMetadata(metaModuleRaw),
  )

  if (options.includeRawSources === true) {
    if (configRaw != null) {
      rawSources.config = configRaw
    }
    if (legacyRaw != null) {
      rawSources.legacy = legacyRaw
    }
    if (metaModuleRaw != null) {
      rawSources.metaModule = metaModuleRaw
    }
    if (Object.keys(rawSources).length > 0) {
      resolved.rawSources = rawSources
    }
  }

  return resolved
}

export function normalizeFederationMetadata(
  metadata: JSONObject | ResolvedFederationMetadata | null | undefined,
): ResolvedFederationMetadata {
  return resolveFederationMetadata({
    legacy: metadata ?? null,
    includeRawSources: hasRawSources(metadata),
  })
}

export function getFederationTitleFallback(
  metadata: ResolvedFederationMetadata | undefined,
  fallbackTitle: string,
): string {
  return metadata?.federationName != null && metadata.federationName !== ''
    ? metadata.federationName
    : fallbackTitle
}

export function extractExternalMetadataPayload(data: unknown): JSONObject | null {
  if (isJSONObject(data)) {
    const firstObjectValue = Object.values(data).find(isJSONObject)
    return firstObjectValue ?? data
  }

  return null
}

function normalizeRawMetadata(raw: JSONObject | null): ResolvedFederationMetadata {
  if (raw == null) {
    return {}
  }

  const resolved: ResolvedFederationMetadata = {}

  assignString(resolved, 'federationName', raw, ['federationName', 'federation_name'])
  assignString(resolved, 'welcomeMessage', raw, ['welcomeMessage', 'welcome_message'])
  assignString(resolved, 'defaultCurrency', raw, [
    'defaultCurrency',
    'default_currency',
    'fedi:default_currency',
  ])
  assignUrl(resolved, 'iconUrl', raw, [
    'iconUrl',
    'federation_icon_url',
    'fedi:federation_icon_url',
  ])
  assignAmountMsats(resolved, 'maxBalanceMsats', raw, [
    'maxBalanceMsats',
    'max_balance_msats',
    'fedi:max_balance_msats',
  ])
  assignAmountMsats(resolved, 'maxInvoiceMsats', raw, [
    'maxInvoiceMsats',
    'max_invoice_msats',
    'fedi:max_invoice_msats',
  ])
  assignUrl(resolved, 'tosUrl', raw, ['tosUrl', 'tos_url', 'fedi:tos_url'])
  assignString(resolved, 'inviteCode', raw, ['inviteCode', 'invite_code'])
  assignString(resolved, 'previewMessage', raw, ['previewMessage', 'preview_message'])
  assignUnixTimestamp(resolved, 'popupEndTimestamp', raw, [
    'popupEndTimestamp',
    'popup_end_timestamp',
    'fedi:popup_end_timestamp',
  ])
  assignString(resolved, 'popupCountdownMessage', raw, [
    'popupCountdownMessage',
    'popup_countdown_message',
    'fedi:popup_countdown_message',
  ])
  assignBoolean(resolved, 'isPublic', raw, ['isPublic', 'public'])
  assignStringList(resolved, 'vettedGateways', raw, ['vettedGateways', 'vetted_gateways'])
  assignUrl(resolved, 'recurringdApi', raw, ['recurringdApi', 'recurringd_api'])
  assignUrl(resolved, 'lnaddressApi', raw, ['lnaddressApi', 'lnaddress_api'])
  assignUnixTimestamp(resolved, 'federationExpiryTimestamp', raw, [
    'federationExpiryTimestamp',
    'federation_expiry_timestamp',
  ])
  assignString(resolved, 'federationSuccessor', raw, [
    'federationSuccessor',
    'federation_successor',
  ])

  if (hasRawSources(raw)) {
    resolved.rawSources = raw.rawSources
  }

  return resolved
}

function mergeResolvedMetadata(
  ...sources: ResolvedFederationMetadata[]
): ResolvedFederationMetadata {
  const merged: ResolvedFederationMetadata = {}

  for (const source of sources) {
    for (const [key, value] of Object.entries(source)) {
      if (value !== undefined) {
        ;(merged as Record<string, unknown>)[key] = value
      }
    }
  }

  return merged
}

function assignString(
  target: ResolvedFederationMetadata,
  field: keyof ResolvedFederationMetadata,
  raw: JSONObject,
  keys: string[],
) {
  const value = getFirstValue(raw, keys)
  if (typeof value === 'string' && value.trim() !== '') {
    ;(target as Record<string, unknown>)[field] = value.trim()
  }
}

function assignUrl(
  target: ResolvedFederationMetadata,
  field: keyof ResolvedFederationMetadata,
  raw: JSONObject,
  keys: string[],
) {
  const value = getFirstValue(raw, keys)
  if (typeof value !== 'string' || value.trim() === '') {
    return
  }

  const normalized = normalizeUrl(value)
  if (normalized != null) {
    ;(target as Record<string, unknown>)[field] = normalized
  }
}

function assignAmountMsats(
  target: ResolvedFederationMetadata,
  field: keyof ResolvedFederationMetadata,
  raw: JSONObject,
  keys: string[],
) {
  const value = parsePositiveInteger(getFirstValue(raw, keys))
  if (value != null) {
    ;(target as Record<string, unknown>)[field] = value
  }
}

function assignUnixTimestamp(
  target: ResolvedFederationMetadata,
  field: keyof ResolvedFederationMetadata,
  raw: JSONObject,
  keys: string[],
) {
  const value = parsePositiveInteger(getFirstValue(raw, keys))
  if (value != null) {
    ;(target as Record<string, unknown>)[field] = value
  }
}

function assignBoolean(
  target: ResolvedFederationMetadata,
  field: keyof ResolvedFederationMetadata,
  raw: JSONObject,
  keys: string[],
) {
  const value = getFirstValue(raw, keys)
  if (typeof value === 'boolean') {
    ;(target as Record<string, unknown>)[field] = value
    return
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') {
      ;(target as Record<string, unknown>)[field] = true
    } else if (normalized === 'false') {
      ;(target as Record<string, unknown>)[field] = false
    }
  }
}

function assignStringList(
  target: ResolvedFederationMetadata,
  field: keyof ResolvedFederationMetadata,
  raw: JSONObject,
  keys: string[],
) {
  const value = getFirstValue(raw, keys)
  if (Array.isArray(value)) {
    const values = value
      .filter((item): item is string => typeof item === 'string' && item.trim() !== '')
      .map((item) => item.trim())
    if (values.length > 0) {
      ;(target as Record<string, unknown>)[field] = values
    }
  }
}

function getFirstValue(raw: JSONObject, keys: string[]): JSONValue | undefined {
  for (const key of keys) {
    const value = raw[key]
    if (value !== undefined && value !== null) {
      return value
    }
  }

  return undefined
}

function parsePositiveInteger(value: JSONValue | undefined): number | undefined {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number.parseInt(value, 10)
        : Number.NaN

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return undefined
  }

  return parsed
}

function normalizeUrl(value: string): string | undefined {
  const trimmed = value.trim()
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed
    }
  } catch {
    return undefined
  }

  return undefined
}

function extractMetaModuleValue(
  value: MetaConsensusValue<JSONObject> | JSONObject | null | undefined,
): JSONObject | null {
  if (value == null) {
    return null
  }

  if ('value' in value && isJSONObject(value.value)) {
    return value.value
  }

  return isJSONObject(value) ? value : null
}

function toJSONObject(
  value: JSONObject | ResolvedFederationMetadata | FederationConfigMetadata | null | undefined,
): JSONObject | null {
  if (value == null) {
    return null
  }

  return isJSONObject(value) ? value : null
}

function isJSONObject(value: unknown): value is JSONObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasRawSources(value: unknown): value is { rawSources: FederationMetadataRawSources } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'rawSources' in value &&
    isJSONObject((value as { rawSources?: unknown }).rawSources)
  )
}
