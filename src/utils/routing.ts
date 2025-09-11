import type { RouteNamedMap } from 'vue-router/auto-routes'
import type { RouteLocationRaw } from 'vue-router'

// Type for all available route names
export type RouteName = keyof RouteNamedMap

// Extract params type for a specific route
export type RouteParams<T extends RouteName> = RouteNamedMap[T]['params']

// Type-safe navigation helper
export function navigateTo<T extends RouteName>(
  name: T,
  options?: {
    params?: RouteParams<T>
    query?: Record<string, string | undefined>
    hash?: string
  }
): RouteLocationRaw {
  return {
    name,
    params: options?.params,
    query: options?.query,
    hash: options?.hash,
  } as RouteLocationRaw
}

// Helper to check if we're on a specific route
export function isRoute<T extends RouteName>(
  routeName: string | symbol | null | undefined,
  expectedRoute: T
): routeName is T {
  return routeName === expectedRoute
}

// Common route names as constants for consistency
export const ROUTES = {
  HOME: '/' as const,
  FEDERATIONS: '/federations/' as const,
  FEDERATION_DETAIL: '/federation/[id]' as const,
  SETTINGS: '/settings/' as const,
  SEND: '/send' as const,
  RECEIVE: '/receive' as const,
  RECEIVE_ECASH: '/receive-ecash' as const,
  SCAN: '/scan' as const,
  SENT_LIGHTNING: '/sent-lightning' as const,
  RECEIVED_LIGHTNING: '/received-lightning' as const,
  TRANSACTION_DETAIL: '/transaction/[id]' as const,
  NOT_FOUND: 'not-found' as const,
} as const

// Type guard for checking if a route has params
export function hasRouteParams<T extends RouteName>(
  routeName: T
): routeName is T & { params: NonNullable<RouteParams<T>> } {
  const routesWithParams: RouteName[] = [
    '/federation/[id]',
    '/transaction/[id]',
  ]
  return routesWithParams.includes(routeName)
}