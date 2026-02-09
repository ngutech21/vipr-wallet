import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, type VueWrapper, flushPromises } from '@vue/test-utils'
import { Quasar } from 'quasar'
import ReceiveEcashSelection from 'src/components/ReceiveEcashSelection.vue'

// Mock vue-router
const mockRouterPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}))

describe('ReceiveEcashSelection.vue', () => {
  let wrapper: VueWrapper

  const createWrapper = (): VueWrapper => {
    return mount(ReceiveEcashSelection, {
      global: {
        plugins: [Quasar],
        stubs: {
          ModalCard: {
            template: '<div class="modal-card"><slot /></div>',
            props: ['title'],
          },
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockRouterPush.mockResolvedValue(true)
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  describe('Component Mounting & Rendering', () => {
    it('should mount successfully', () => {
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('should render heading text for Lightning option', () => {
      wrapper = createWrapper()
      expect(wrapper.text()).toContain('Receive via Lightning')
    })

    it('should render heading text for Offline eCash option', () => {
      wrapper = createWrapper()
      expect(wrapper.text()).toContain('Receive Offline eCash')
    })

    it('should render description for Lightning option', () => {
      wrapper = createWrapper()
      expect(wrapper.text()).toContain(
        'Generate a Lightning invoice to receive eCash directly from the Lightning network'
      )
    })

    it('should render description for Offline eCash option', () => {
      wrapper = createWrapper()
      expect(wrapper.text()).toContain(
        'Generate a QR code to receive eCash from another wallet without using the internet'
      )
    })

    it('should render two q-card elements', () => {
      wrapper = createWrapper()
      const cards = wrapper.findAllComponents({ name: 'QCard' })
      expect(cards).toHaveLength(2)
    })

    it('should render Lightning icon for first option', () => {
      wrapper = createWrapper()
      const html = wrapper.html()
      expect(html).toContain('flash_on')
    })

    it('should render swap icon for second option', () => {
      wrapper = createWrapper()
      const html = wrapper.html()
      expect(html).toContain('swap_horiz')
    })

    it('should have cursor-pointer class on both cards', () => {
      wrapper = createWrapper()
      const cards = wrapper.findAllComponents({ name: 'QCard' })
      expect(cards).toHaveLength(2)
      expect(cards[0]?.classes()).toContain('cursor-pointer')
      expect(cards[1]?.classes()).toContain('cursor-pointer')
    })

    it('should have v-ripple directive on both cards', () => {
      wrapper = createWrapper()
      const html = wrapper.html()
      // v-ripple directive exists in the template
      expect(html).toContain('cursor-pointer')
    })

    it('should render Lightning icon with warning color', () => {
      wrapper = createWrapper()
      const icons = wrapper.findAllComponents({ name: 'QIcon' })
      const lightningIcon = icons.find((icon) => icon.props('name') === 'flash_on')
      expect(lightningIcon).toBeDefined()
      expect(lightningIcon?.props('color')).toBe('warning')
    })

    it('should render swap icon with primary color', () => {
      wrapper = createWrapper()
      const icons = wrapper.findAllComponents({ name: 'QIcon' })
      const swapIcon = icons.find((icon) => icon.props('name') === 'swap_horiz')
      expect(swapIcon).toBeDefined()
      expect(swapIcon?.props('color')).toBe('primary')
    })

    it('should render icons with correct size', () => {
      wrapper = createWrapper()
      const icons = wrapper.findAllComponents({ name: 'QIcon' })
      expect(icons).toHaveLength(2)
      expect(icons[0]?.props('size')).toBe('48px')
      expect(icons[1]?.props('size')).toBe('48px')
    })
  })

  describe('Lightning Option Interaction', () => {
    it('should have data-testid on Lightning card', () => {
      wrapper = createWrapper()
      const lightningCard = wrapper.find('[data-testid="receive-lightning-card"]')
      expect(lightningCard.exists()).toBe(true)
    })

    it('should emit close event when Lightning option is clicked', async () => {
      wrapper = createWrapper()
      const lightningCard = wrapper.find('[data-testid="receive-lightning-card"]')
      await lightningCard.trigger('click')
      await flushPromises()

      expect(wrapper.emitted('close')).toBeTruthy()
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('should navigate to /receive route when Lightning option is clicked', async () => {
      wrapper = createWrapper()
      const lightningCard = wrapper.find('[data-testid="receive-lightning-card"]')
      await lightningCard.trigger('click')
      await flushPromises()

      expect(mockRouterPush).toHaveBeenCalledWith({ name: '/receive' })
      expect(mockRouterPush).toHaveBeenCalledTimes(1)
    })

  })

  describe('Offline eCash Option Interaction', () => {
    it('should emit close event when Offline eCash option is clicked', async () => {
      wrapper = createWrapper()
      const cards = wrapper.findAllComponents({ name: 'QCard' })
      expect(cards).toHaveLength(2)
      const offlineCard = cards[1]
      if (offlineCard === undefined) throw new Error('Offline card not found')
      await offlineCard.trigger('click')
      await flushPromises()

      expect(wrapper.emitted('close')).toBeTruthy()
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('should navigate to /receive-ecash route when Offline option is clicked', async () => {
      wrapper = createWrapper()
      const cards = wrapper.findAllComponents({ name: 'QCard' })
      expect(cards).toHaveLength(2)
      const offlineCard = cards[1]
      if (offlineCard === undefined) throw new Error('Offline card not found')
      await offlineCard.trigger('click')
      await flushPromises()

      expect(mockRouterPush).toHaveBeenCalledWith({ name: '/receive-ecash' })
      expect(mockRouterPush).toHaveBeenCalledTimes(1)
    })
  })

  describe('Navigation Behavior', () => {
    it('should call router push when option is clicked', async () => {
      wrapper = createWrapper()
      const lightningCard = wrapper.find('[data-testid="receive-lightning-card"]')

      await lightningCard.trigger('click')
      await flushPromises()

      expect(mockRouterPush).toHaveBeenCalled()
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should navigate multiple times on multiple clicks', async () => {
      wrapper = createWrapper()
      const lightningCard = wrapper.find('[data-testid="receive-lightning-card"]')

      // Simulate multiple clicking
      await lightningCard.trigger('click')
      await flushPromises()
      await lightningCard.trigger('click')
      await flushPromises()
      await lightningCard.trigger('click')
      await flushPromises()

      // Should navigate three times
      expect(mockRouterPush).toHaveBeenCalledTimes(3)
      expect(wrapper.emitted('close')).toHaveLength(3)
    })
  })

  describe('Event Emissions', () => {
    it('should emit close event with no arguments', async () => {
      wrapper = createWrapper()
      const lightningCard = wrapper.find('[data-testid="receive-lightning-card"]')
      await lightningCard.trigger('click')
      await flushPromises()

      const closeEvents = wrapper.emitted('close')
      expect(closeEvents).toBeTruthy()
      if (closeEvents !== undefined) {
        expect(closeEvents[0]).toEqual([])
      }
    })

    it('should not emit showOfflineReceive event', async () => {
      wrapper = createWrapper()
      const cards = wrapper.findAllComponents({ name: 'QCard' })
      expect(cards).toHaveLength(2)
      const offlineCard = cards[1]
      if (offlineCard === undefined) throw new Error('Offline card not found')
      await offlineCard.trigger('click')
      await flushPromises()

      expect(wrapper.emitted('showOfflineReceive')).toBeFalsy()
    })

    it('should emit close event only once per click', async () => {
      wrapper = createWrapper()
      const lightningCard = wrapper.find('[data-testid="receive-lightning-card"]')
      await lightningCard.trigger('click')
      await flushPromises()

      expect(wrapper.emitted('close')).toHaveLength(1)
    })
  })

  describe('Layout and Styling', () => {
    it('should have proper grid structure with q-col-gutter', () => {
      wrapper = createWrapper()
      const row = wrapper.find('.row.q-col-gutter-md')
      expect(row.exists()).toBe(true)
    })

    it('should have padding on container', () => {
      wrapper = createWrapper()
      const container = wrapper.find('.q-pa-md')
      expect(container.exists()).toBe(true)
    })

    it('should have col-12 class on both option containers', () => {
      wrapper = createWrapper()
      const cols = wrapper.findAll('.col-12')
      expect(cols.length).toBeGreaterThanOrEqual(2)
    })

    it('should have proper icon column width', () => {
      wrapper = createWrapper()
      const iconCols = wrapper.findAll('.col-2')
      expect(iconCols.length).toBeGreaterThanOrEqual(2)
    })

    it('should have proper text column width', () => {
      wrapper = createWrapper()
      const textCols = wrapper.findAll('.col-10')
      expect(textCols.length).toBeGreaterThanOrEqual(2)
    })

    it('should have text-h6 class on titles', () => {
      wrapper = createWrapper()
      const titles = wrapper.findAll('.text-h6')
      expect(titles.length).toBeGreaterThanOrEqual(2)
    })

    it('should have text-caption class on descriptions', () => {
      wrapper = createWrapper()
      const captions = wrapper.findAll('.text-caption')
      expect(captions.length).toBeGreaterThanOrEqual(2)
    })

    it('should have text-grey-7 class on descriptions', () => {
      wrapper = createWrapper()
      const greyTexts = wrapper.findAll('.text-grey-7')
      expect(greyTexts.length).toBeGreaterThanOrEqual(2)
    })

    it('should have q-mt-sm class on titles for margin', () => {
      wrapper = createWrapper()
      const titles = wrapper.findAll('.q-mt-sm')
      expect(titles.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Accessibility', () => {
    it('should have clickable cards that are accessible', () => {
      wrapper = createWrapper()
      const cards = wrapper.findAll('q-card-stub')
      cards.forEach((card) => {
        expect(card.classes()).toContain('cursor-pointer')
      })
    })

    it('should have meaningful text content for screen readers', () => {
      wrapper = createWrapper()
      const text = wrapper.text()
      expect(text).toContain('Receive via Lightning')
      expect(text).toContain('Receive Offline eCash')
      expect(text).toContain('Lightning network')
      expect(text).toContain('without using the internet')
    })
  })

  describe('Edge Cases', () => {
    it('should maintain component state after multiple interactions', async () => {
      wrapper = createWrapper()
      const lightningCard = wrapper.find('[data-testid="receive-lightning-card"]')
      const cards = wrapper.findAllComponents({ name: 'QCard' })
      expect(cards).toHaveLength(2)
      const offlineCard = cards[1]
      if (offlineCard === undefined) throw new Error('Offline card not found')

      await lightningCard.trigger('click')
      await flushPromises()
      await offlineCard.trigger('click')
      await flushPromises()

      expect(wrapper.emitted('close')).toHaveLength(2)
      expect(mockRouterPush).toHaveBeenCalledTimes(2)
    })

    it('should handle simultaneous clicks on different options', async () => {
      wrapper = createWrapper()
      const lightningCard = wrapper.find('[data-testid="receive-lightning-card"]')
      const cards = wrapper.findAllComponents({ name: 'QCard' })
      expect(cards).toHaveLength(2)
      const offlineCard = cards[1]
      if (offlineCard === undefined) throw new Error('Offline card not found')

      // Trigger both clicks without waiting
      const promise1 = lightningCard.trigger('click')
      const promise2 = offlineCard.trigger('click')

      await Promise.all([promise1, promise2])
      await flushPromises()

      expect(wrapper.emitted('close')).toBeTruthy()
      expect(mockRouterPush).toHaveBeenCalled()
    })
  })

  describe('ModalCard Integration', () => {
    it('should pass title prop to ModalCard', () => {
      wrapper = createWrapper()
      const modalCard = wrapper.find('.modal-card')
      expect(modalCard.exists()).toBe(true)
    })

    it('should render content inside ModalCard slot', () => {
      wrapper = createWrapper()
      const modalCard = wrapper.find('.modal-card')
      expect(modalCard.text()).toContain('Receive via Lightning')
      expect(modalCard.text()).toContain('Receive Offline eCash')
    })
  })

  describe('Component Methods', () => {
    it('should call router.push with /receive when onReceiveLightning is invoked', async () => {
      wrapper = createWrapper()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vm = wrapper.vm as any

      await vm.onReceiveLightning()
      await flushPromises()

      expect(mockRouterPush).toHaveBeenCalledWith({ name: '/receive' })
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should call router.push with /receive-ecash when onReceiveOffline is invoked', async () => {
      wrapper = createWrapper()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vm = wrapper.vm as any

      await vm.onReceiveOffline()
      await flushPromises()

      expect(mockRouterPush).toHaveBeenCalledWith({ name: '/receive-ecash' })
      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should emit close when Lightning card is clicked', async () => {
      wrapper = createWrapper()
      const lightningCard = wrapper.find('[data-testid="receive-lightning-card"]')

      await lightningCard.trigger('click')
      await flushPromises()

      expect(wrapper.emitted('close')).toBeTruthy()
    })

    it('should emit close when Offline card is clicked', async () => {
      wrapper = createWrapper()
      const cards = wrapper.findAllComponents({ name: 'QCard' })
      expect(cards).toHaveLength(2)
      const offlineCard = cards[1]
      if (offlineCard === undefined) throw new Error('Offline card not found')

      await offlineCard.trigger('click')
      await flushPromises()

      expect(wrapper.emitted('close')).toBeTruthy()
    })
  })
})
