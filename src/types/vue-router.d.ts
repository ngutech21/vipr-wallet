import 'vue-router'

// Define route-specific query interfaces
export interface SendRouteQuery {
  invoice?: string
  [key: string]: string | string[] | undefined
}

// Augment the vue-router module
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
  }

  interface RouteQuery {
    send: SendRouteQuery
  }
}
