import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    hideBottomNav?: boolean
    title?: string
  }
}
