import { describe, it, expect, beforeEach } from 'vitest'
import { createMemoryHistory, createRouter, type Router, type RouteRecordRaw } from 'vue-router'
import type { RouteNamedMap } from 'vue-router/auto-routes'


// Define routes manually to match unplugin-vue-router structure
const testRoutes: RouteRecordRaw[] = [
  { path: '/', name: '/', component: { template: '<div>Home</div>' } },
  { path: '/settings', name: '/settings/', component: { template: '<div>Settings</div>' } },
  { path: '/federations', name: '/federations/', component: { template: '<div>Federations</div>' } },
  { path: '/receive', name: '/receive', component: { template: '<div>Receive</div>' } },
  { path: '/send', name: '/send', component: { template: '<div>Send</div>' } },
  { path: '/federation/:id', name: '/federation/[id]', component: { template: '<div>Federation</div>' } },
  { path: '/transaction/:id', name: '/transaction/[id]', component: { template: '<div>Transaction</div>' } },
  // Catch-all route - must be last
  { path: '/:path(.*)', name: 'not-found', component: { template: '<div>Not Found</div>' } },
]

describe('Router Catch-All Route', () => {
  let router: Router

  beforeEach(() => {
    router = createRouter({
      history: createMemoryHistory(),
      routes: testRoutes,
    })
  })

  describe('Non-existent routes', () => {
    it('should resolve /fld to the catch-all route', () => {
      const resolved = router.resolve('/fld')
      expect(resolved.name).toBe('not-found')
      expect((resolved.params as RouteNamedMap['not-found']['params']).path).toBe('fld')
    })

    it('should resolve /invalid to the catch-all route', () => {
      const resolved = router.resolve('/invalid')
      expect(resolved.name).toBe('not-found')
      expect((resolved.params as RouteNamedMap['not-found']['params']).path).toBe('invalid')
    })

    it('should resolve deep non-existent paths to the catch-all route', () => {
      const resolved = router.resolve('/some/deep/nonexistent/path')
      expect(resolved.name).toBe('not-found')
      expect((resolved.params as RouteNamedMap['not-found']['params']).path).toBe('some/deep/nonexistent/path')
    })

    it('should resolve paths with special characters to the catch-all route', () => {
      const resolved = router.resolve('/test-123_path')
      expect(resolved.name).toBe('not-found')
      expect((resolved.params as RouteNamedMap['not-found']['params']).path).toBe('test-123_path')
    })
  })

  describe('Valid routes', () => {
    it('should resolve / to the index route', () => {
      const resolved = router.resolve('/')
      expect(resolved.name).toBe('/')
      expect(resolved.name).not.toBe('not-found')
    })

    it('should resolve /settings to the settings route', () => {
      const resolved = router.resolve('/settings')
      expect(resolved.name).toBe('/settings/')
      expect(resolved.name).not.toBe('not-found')
    })

    it('should resolve /federations to the federations route', () => {
      const resolved = router.resolve('/federations')
      expect(resolved.name).toBe('/federations/')
      expect(resolved.name).not.toBe('not-found')
    })

    it('should resolve /receive to the receive route', () => {
      const resolved = router.resolve('/receive')
      expect(resolved.name).toBe('/receive')
      expect(resolved.name).not.toBe('not-found')
    })

    it('should resolve /send to the send route', () => {
      const resolved = router.resolve('/send')
      expect(resolved.name).toBe('/send')
      expect(resolved.name).not.toBe('not-found')
    })
  })

  describe('Dynamic routes', () => {
    it('should resolve /federation/abc123 to the federation detail route', () => {
      const resolved = router.resolve('/federation/abc123')
      expect(resolved.name).toBe('/federation/[id]')
      expect((resolved.params as RouteNamedMap['/federation/[id]']['params']).id).toBe('abc123')
      expect(resolved.name).not.toBe('not-found')
    })

    it('should resolve /transaction/tx456 to the transaction detail route', () => {
      const resolved = router.resolve('/transaction/tx456')
      expect(resolved.name).toBe('/transaction/[id]')
      expect((resolved.params as RouteNamedMap['/transaction/[id]']['params']).id).toBe('tx456')
      expect(resolved.name).not.toBe('not-found')
    })
  })

  describe('Edge cases', () => {
    it('should handle paths with query parameters', () => {
      const resolved = router.resolve('/nonexistent?foo=bar')
      expect(resolved.name).toBe('not-found')
    })

    it('should handle paths with hash fragments', () => {
      const resolved = router.resolve('/nonexistent#section')
      expect(resolved.name).toBe('not-found')
    })

    it('should handle paths with trailing slashes', () => {
      const resolved = router.resolve('/nonexistent/')
      expect(resolved.name).toBe('not-found')
    })
  })
})
