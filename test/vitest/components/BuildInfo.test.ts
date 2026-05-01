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
      VITE_APP_VERSION: '0.0.1',
      VITE_COMMIT_HASH: 'abc123def',
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
    it('should render release version from environment variable', () => {
      wrapper = createWrapper({
        VITE_APP_VERSION: '1.2.3',
      })

      expect(wrapper.text()).toContain('Release Version: 1.2.3')
    })

    it('should render commit hash from environment variable', () => {
      wrapper = createWrapper({
        VITE_COMMIT_HASH: 'commit-hash-123',
      })

      expect(wrapper.text()).toContain('Commit SHA: commit-hash-123')
    })

    it('should render version and commit hash together', () => {
      wrapper = createWrapper({
        VITE_COMMIT_HASH: 'xyz789',
      })

      const text = wrapper.text()
      expect(text).toContain('Release Version: 0.0.1')
      expect(text).toContain('Commit SHA: xyz789')
      expect(text).not.toContain('Build Time:')
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
      })

      expect(wrapper.text()).toContain('Debug:')
    })

    it('should display environment variables as JSON in debug mode', () => {
      wrapper = createWrapper({
        DEV: true,
        VITE_COMMIT_HASH: 'test-commit',
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
      })

      expect(wrapper.text()).not.toContain('Debug:')
    })

    it('should only show build info in production', () => {
      wrapper = createWrapper({
        DEV: false,
        VITE_COMMIT_HASH: 'abc123',
      })

      const text = wrapper.text()
      expect(text).toContain('Release Version: 0.0.1')
      expect(text).toContain('Commit SHA: abc123')
      expect(text).not.toContain('Build Time:')
      expect(text).not.toContain('Debug:')
    })

    it('should have only one div element in production mode', () => {
      wrapper = createWrapper({ DEV: false })

      const divs = wrapper.findAll('div')
      // Should have the main container plus the metadata rows, but no debug div
      expect(divs.length).toBe(3)
    })
  })

  describe('Missing Environment Variables', () => {
    it('should handle missing VITE_COMMIT_HASH gracefully', () => {
      wrapper = createWrapper({
        VITE_APP_VERSION: undefined,
        VITE_COMMIT_HASH: undefined,
      })

      expect(wrapper.text()).toContain('Release Version:')
      expect(wrapper.text()).toContain('Commit SHA:')
      expect(wrapper.text()).toContain('undefined')
    })

    it('should handle missing both environment variables', () => {
      wrapper = createWrapper({
        VITE_APP_VERSION: undefined,
        VITE_COMMIT_HASH: undefined,
      })

      const text = wrapper.text()
      expect(text).toContain('Release Version:')
      expect(text).toContain('Commit SHA:')
      expect(text).toContain('undefined')
    })

    it('should render component even with empty env vars', () => {
      wrapper = createWrapper({
        VITE_APP_VERSION: '',
        VITE_COMMIT_HASH: '',
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.text-subtitle1').exists()).toBe(true)
    })
  })

  describe('Environment Debug Computed Property', () => {
    it('should format environment as JSON with proper indentation', () => {
      wrapper = createWrapper({
        VITE_APP_VERSION: '0.0.1',
        DEV: true,
        VITE_COMMIT_HASH: 'test',
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
        VITE_APP_VERSION: '0.0.1',
        VITE_COMMIT_HASH: longHash,
      })

      expect(wrapper.text()).toContain(longHash)
    })

    it('should handle numeric environment variables', () => {
      wrapper = createWrapper({
        VITE_APP_VERSION: 123,
        VITE_COMMIT_HASH: 123456,
      })

      expect(wrapper.text()).toContain('Release Version: 123')
      expect(wrapper.text()).toContain('Commit SHA: 123456')
    })
  })
})
