import type { Federation } from 'src/types/federation'

export function federationHasModule(federation: Federation, kind: string): boolean {
  const normalizedKind = kind.trim().toLowerCase()

  return federation.modules.some((module) => module.kind.trim().toLowerCase() === normalizedKind)
}
