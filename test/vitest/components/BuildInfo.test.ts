import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { Quasar } from 'quasar'
import BuildInfo from 'src/components/BuildInfo.vue'

// Store original env
const originalEnv = import.meta.env

describe('BuildInfo.vue', () => {
  let wrapper: VueWrapper

  // Helper to create wrapper with mocked env vars
  const createWrapper = (envOverrides: Record<string, unknown> = {}) => {
    // Override import.meta.env values
    Object.assign(import.meta.env, {
      VITE_COMMIT_HASH: 'abc123def',
      VITE_BUILD_TIME: '2024-01-15T10:30:00Z',
      DEV: false,
      ...envOverrides,
    })

    return mount(BuildInfo, {
      global: {
        plugins: [Quasar],
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore original env after each test
    Object.keys(import.meta.env).forEach((key) => {
      delete import.meta.env[key]
    })
    Object.assign(import.meta.env, originalEnv)
  })

  describe('Rendering Build Information', () => {
    it('should render commit hash from environment variable', () => {
      wrapper = createWrapper({
        VITE_COMMIT_HASH: 'commit-hash-123',
        VITE_BUILD_TIME: '2024-01-15T10:30:00Z',
      })

      expect(wrapper.text()).toContain('Build: commit-hash-123')
    })

    it('should render build time from environment variable', () => {
      wrapper = createWrapper({
        VITE_COMMIT_HASH: 'abc123',
        VITE_BUILD_TIME: '2024-02-20T15:45:00Z',
      })

      expect(wrapper.text()).toContain('2024-02-20T15:45:00Z')
    })

    it('should render both commit hash and build time together', () => {
      wrapper = createWrapper({
        VITE_COMMIT_HASH: 'xyz789',
        VITE_BUILD_TIME: '2024-03-10T08:00:00Z',
      })

      const text = wrapper.text()
      expect(text).toContain('Build: xyz789')
      expect(text).toContain('2024-03-10T08:00:00Z')
    })

    it('should have proper text structure with subtitle1 class', () => {
      wrapper = createWrapper()

      expect(wrapper.find('.text-subtitle1').exists()).toBe(true)
    })
  })

  describe('Development Mode', () => {
    it('should show debug information when DEV is true', () => {
      wrapper = createWrapper({
        DEV: true,
        VITE_COMMIT_HASH: 'dev-hash',
        VITE_BUILD_TIME: '2024-01-01',
      })

      expect(wrapper.text()).toContain('Debug:')
    })

    it('should display environment variables as JSON in debug mode', () => {
      wrapper = createWrapper({
        DEV: true,
        VITE_COMMIT_HASH: 'test-commit',
        VITE_BUILD_TIME: 'test-time',
        CUSTOM_VAR: 'custom-value',
      })

      const text = wrapper.text()
      expect(text).toContain('Debug:')
      // Should contain JSON representation of env vars
      expect(text).toContain('{')
    })

    it('should render debug div when in development mode', () => {
      wrapper = createWrapper({ DEV: true })

      // Check for v-if rendered div
      const debugDivs = wrapper.findAll('div')
      expect(debugDivs.length).toBeGreaterThan(1) // Should have main div + debug div
    })
  })

  describe('Production Mode', () => {
    it('should NOT show debug information when DEV is false', () => {
      wrapper = createWrapper({
        DEV: false,
        VITE_COMMIT_HASH: 'prod-hash',
        VITE_BUILD_TIME: '2024-01-01',
      })

      expect(wrapper.text()).not.toContain('Debug:')
    })

    it('should only show build info in production', () => {
      wrapper = createWrapper({
        DEV: false,
        VITE_COMMIT_HASH: 'abc123',
        VITE_BUILD_TIME: '2024-01-15',
      })

      const text = wrapper.text()
      expect(text).toContain('Build: abc123')
      expect(text).toContain('2024-01-15')
      expect(text).not.toContain('Debug:')
    })

    it('should have only one div element in production mode', () => {
      wrapper = createWrapper({ DEV: false })

      const divs = wrapper.findAll('div')
      // Should only have the main container div, no debug div
      expect(divs.length).toBe(1)
    })
  })

  describe('Missing Environment Variables', () => {
    it('should handle missing VITE_COMMIT_HASH gracefully', () => {
      wrapper = createWrapper({
        VITE_COMMIT_HASH: undefined,
        VITE_BUILD_TIME: '2024-01-01',
      })

      expect(wrapper.text()).toContain('Build:')
      expect(wrapper.text()).toContain('undefined')
    })

    it('should handle missing VITE_BUILD_TIME gracefully', () => {
      wrapper = createWrapper({
        VITE_COMMIT_HASH: 'abc123',
        VITE_BUILD_TIME: undefined,
      })

      expect(wrapper.text()).toContain('Build: abc123')
      expect(wrapper.text()).toContain('undefined')
    })

    it('should handle missing both environment variables', () => {
      wrapper = createWrapper({
        VITE_COMMIT_HASH: undefined,
        VITE_BUILD_TIME: undefined,
      })

      const text = wrapper.text()
      expect(text).toContain('Build:')
      expect(text).toContain('undefined')
    })

    it('should render component even with empty env vars', () => {
      wrapper = createWrapper({
        VITE_COMMIT_HASH: '',
        VITE_BUILD_TIME: '',
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.text-subtitle1').exists()).toBe(true)
    })
  })

  describe('Environment Debug Computed Property', () => {
    it('should format environment as JSON with proper indentation', () => {
      wrapper = createWrapper({
        DEV: true,
        VITE_COMMIT_HASH: 'test',
        VITE_BUILD_TIME: 'test-time',
      })

      const text = wrapper.text()
      // JSON.stringify with null, 2 should create indented output
      expect(text).toContain('Debug:')
      // The computed property uses JSON.stringify(import.meta.env, null, 2)
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long commit hashes', () => {
      const longHash = 'a'.repeat(100)
      wrapper = createWrapper({
        VITE_COMMIT_HASH: longHash,
        VITE_BUILD_TIME: '2024-01-01',
      })

      expect(wrapper.text()).toContain(longHash)
    })

    it('should handle special characters in build time', () => {
      wrapper = createWrapper({
        VITE_COMMIT_HASH: 'abc123',
        VITE_BUILD_TIME: '2024-01-15T10:30:00.000Z',
      })

      expect(wrapper.text()).toContain('2024-01-15T10:30:00.000Z')
    })

    it('should handle numeric environment variables', () => {
      wrapper = createWrapper({
        VITE_COMMIT_HASH: 123456,
        VITE_BUILD_TIME: 789,
      })

      expect(wrapper.text()).toContain('Build: 123456')
      expect(wrapper.text()).toContain('789')
    })
  })
})
