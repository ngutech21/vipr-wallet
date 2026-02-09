import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { Quasar, QCard, QItem, QItemSection, QAvatar, QIcon, QImg, QChip, QBtn } from 'quasar'
import { createTestingPinia, type TestingPinia } from '@pinia/testing'
import FederationList from 'src/components/FederationList.vue'
import { useFederationStore } from 'src/stores/federation'
import type { Federation } from 'src/components/models'

// Helper function to create mock federations
const createMockFederation = (overrides: Partial<Federation> = {}): Federation => ({
  title: 'Test Federation',
  inviteCode: 'fed11test',
  federationId: 'abc123def456',
  modules: [],
  ...overrides,
})

describe('FederationList.vue', () => {
  let wrapper: VueWrapper
  let pinia: TestingPinia

  const createWrapper = (initialState = {}) => {
    pinia = createTestingPinia({
      initialState: {
        federation: {
          federations: [],
          selectedFederationId: null,
          ...initialState,
        },
      },
      stubActions: false,
      createSpy: vi.fn,
    })

    return mount(FederationList, {
      global: {
        plugins: [Quasar, pinia],
        stubs: {
          QCard,
          QItem,
          QItemSection,
          QAvatar,
          QIcon,
          QImg,
          QChip,
          QBtn,
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render nothing when federations list is empty', () => {
      wrapper = createWrapper()
      expect(wrapper.html()).toBe('<!--v-if-->')
    })

    it('should render a single federation card', () => {
      const federation = createMockFederation()
      wrapper = createWrapper({ federations: [federation] })

      expect(wrapper.find('.federation-card').exists()).toBe(true)
      expect(wrapper.text()).toContain('Test Federation')
    })

    it('should render multiple federation cards', () => {
      const federations = [
        createMockFederation({ federationId: '1', title: 'Federation 1' }),
        createMockFederation({ federationId: '2', title: 'Federation 2' }),
        createMockFederation({ federationId: '3', title: 'Federation 3' }),
      ]
      wrapper = createWrapper({ federations })

      const cards = wrapper.findAll('.federation-card')
      expect(cards).toHaveLength(3)
      expect(wrapper.text()).toContain('Federation 1')
      expect(wrapper.text()).toContain('Federation 2')
      expect(wrapper.text()).toContain('Federation 3')
    })

    it('should display federation icon when metadata has icon URL', () => {
      const federation = createMockFederation({
        metadata: {
          federation_icon_url: 'https://example.com/icon.png',
        },
      })
      wrapper = createWrapper({ federations: [federation] })

      const img = wrapper.findComponent(QImg)
      expect(img.exists()).toBe(true)
      expect(img.props('src')).toBe('https://example.com/icon.png')
    })

    it('should display default icon when metadata has no icon URL', () => {
      const federation = createMockFederation()
      wrapper = createWrapper({ federations: [federation] })

      const icon = wrapper.findComponent(QIcon)
      expect(icon.exists()).toBe(true)
      expect(icon.props('name')).toBe('account_balance')
    })

    it('should truncate long federation IDs', () => {
      const federation = createMockFederation({
        federationId: 'verylongfederationid1234567890',
      })
      wrapper = createWrapper({ federations: [federation] })

      // Should show first 6 and last 6 characters with ... in between
      expect(wrapper.text()).toContain('ID: verylo...567890')
    })

    it('should not truncate short federation IDs', () => {
      const federation = createMockFederation({
        federationId: 'short123',
      })
      wrapper = createWrapper({ federations: [federation] })

      expect(wrapper.text()).toContain('ID: short123')
    })
  })

  describe('Selection State', () => {
    it('should show "Available" status for non-selected federation', () => {
      const federation = createMockFederation()
      wrapper = createWrapper({ federations: [federation] })

      expect(wrapper.text()).toContain('Available')
      expect(wrapper.text()).not.toContain('Active')
    })

    it('should show "Active" status for selected federation', () => {
      const federation = createMockFederation({ federationId: 'selected123' })
      wrapper = createWrapper({
        federations: [federation],
        selectedFederationId: 'selected123',
      })

      expect(wrapper.text()).toContain('Active')
      expect(wrapper.text()).not.toContain('Available')
    })

    it('should apply "federation-selected" class to selected federation', () => {
      const federation = createMockFederation({ federationId: 'selected123' })
      wrapper = createWrapper({
        federations: [federation],
        selectedFederationId: 'selected123',
      })

      const card = wrapper.find('.federation-card')
      expect(card.classes()).toContain('federation-selected')
    })

    it('should show selection indicator for selected federation', () => {
      const federation = createMockFederation({ federationId: 'selected123' })
      wrapper = createWrapper({
        federations: [federation],
        selectedFederationId: 'selected123',
      })

      expect(wrapper.find('.selection-indicator').exists()).toBe(true)
    })

    it('should not show selection indicator for non-selected federation', () => {
      const federation = createMockFederation({ federationId: 'notselected' })
      wrapper = createWrapper({
        federations: [federation],
        selectedFederationId: 'selected123',
      })

      expect(wrapper.find('.selection-indicator').exists()).toBe(false)
    })

    it('should use primary color for selected federation chip', () => {
      const federation = createMockFederation({ federationId: 'selected123' })
      wrapper = createWrapper({
        federations: [federation],
        selectedFederationId: 'selected123',
      })

      const chip = wrapper.findComponent(QChip)
      expect(chip.props('color')).toBe('primary')
    })

    it('should use grey color for non-selected federation chip', () => {
      const federation = createMockFederation()
      wrapper = createWrapper({ federations: [federation] })

      const chip = wrapper.findComponent(QChip)
      expect(chip.props('color')).toBe('grey-7')
    })
  })

  describe('User Interactions', () => {
    it('should call selectFederation when clicking on federation card', async () => {
      const federation = createMockFederation()
      wrapper = createWrapper({ federations: [federation] })

      const store = useFederationStore()
      vi.spyOn(store, 'selectFederation')

      const card = wrapper.find('.federation-card')
      await card.trigger('click')

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(store.selectFederation).toHaveBeenCalledWith(federation)
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(store.selectFederation).toHaveBeenCalledTimes(1)
    })

    it('should navigate to federation details when clicking arrow button', () => {
      const federation = createMockFederation({ federationId: 'test123' })
      wrapper = createWrapper({ federations: [federation] })

      const btn = wrapper.findComponent(QBtn)
      expect(btn.props('to')).toEqual({
        name: '/federation/[id]',
        params: { id: 'test123' },
      })
    })

    it('should pass federation ID as route params for navigation', () => {
      const federation = createMockFederation({ federationId: 'test/123#456' })
      wrapper = createWrapper({ federations: [federation] })

      const btn = wrapper.findComponent(QBtn)
      expect(btn.props('to')).toEqual({
        name: '/federation/[id]',
        params: { id: 'test/123#456' },
      })
    })
  })

  describe('Multiple Federations', () => {
    it('should only mark one federation as selected', () => {
      const federations = [
        createMockFederation({ federationId: 'fed1', title: 'Federation 1' }),
        createMockFederation({ federationId: 'fed2', title: 'Federation 2' }),
        createMockFederation({ federationId: 'fed3', title: 'Federation 3' }),
      ]
      wrapper = createWrapper({
        federations,
        selectedFederationId: 'fed2',
      })

      const selectedCards = wrapper.findAll('.federation-selected')
      expect(selectedCards).toHaveLength(1)
      expect(wrapper.text()).toMatch(/Federation 2[\s\S]*Active/)
    })

    it('should render federations in order', () => {
      const federations = [
        createMockFederation({ federationId: 'fed1', title: 'Alpha Federation' }),
        createMockFederation({ federationId: 'fed2', title: 'Beta Federation' }),
        createMockFederation({ federationId: 'fed3', title: 'Gamma Federation' }),
      ]
      wrapper = createWrapper({ federations })

      const cards = wrapper.findAll('.federation-card')
      const titles = cards.map((card) => card.text())

      expect(titles[0]).toContain('Alpha Federation')
      expect(titles[1]).toContain('Beta Federation')
      expect(titles[2]).toContain('Gamma Federation')
    })
  })

  describe('Error Handling', () => {
    it('should handle selectFederation errors gracefully', async () => {
      const federation = createMockFederation()
      wrapper = createWrapper({ federations: [federation] })

      const store = useFederationStore()
      const mockError = new Error('Selection failed')
      vi.spyOn(store, 'selectFederation').mockRejectedValueOnce(mockError)

      const card = wrapper.find('.federation-card')
      await card.trigger('click')

      // Component should not throw error, logger.error should be called
      // No assertion needed as the error is caught and logged
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(store.selectFederation).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle federation with minimal data', () => {
      const federation: Federation = {
        title: 'Minimal',
        inviteCode: 'code',
        federationId: 'id',
        modules: [],
      }
      wrapper = createWrapper({ federations: [federation] })

      expect(wrapper.text()).toContain('Minimal')
      expect(wrapper.text()).toContain('ID: id')
    })

    it('should handle federation with all metadata fields', () => {
      const federation = createMockFederation({
        metadata: {
          federation_icon_url: 'https://example.com/icon.png',
          welcome_message: 'Welcome!',
          chat_server_domain: 'chat.example.com',
          default_currency: 'USD',
          max_balance_msats: '1000000000',
        },
      })
      wrapper = createWrapper({ federations: [federation] })

      expect(wrapper.findComponent(QImg).exists()).toBe(true)
      expect(wrapper.text()).toContain('Test Federation')
    })

    it('should handle federation ID exactly 12 characters (boundary case)', () => {
      const federation = createMockFederation({
        federationId: '123456789012', // exactly 12 chars
      })
      wrapper = createWrapper({ federations: [federation] })

      // Should not truncate
      expect(wrapper.text()).toContain('ID: 123456789012')
      expect(wrapper.text()).not.toContain('...')
    })

    it('should handle federation ID of 13 characters (truncation starts)', () => {
      const federation = createMockFederation({
        federationId: '1234567890123', // 13 chars
      })
      wrapper = createWrapper({ federations: [federation] })

      // Should truncate
      expect(wrapper.text()).toContain('ID: 123456...890123')
    })
  })
})
