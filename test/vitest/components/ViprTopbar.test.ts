import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ViprTopbar from 'src/components/ViprTopbar.vue'

const QBtnStub = {
  props: {
    to: { type: [String, Object], required: false, default: undefined },
    color: { type: String, required: false, default: undefined },
    icon: { type: String, required: false, default: '' },
  },
  emits: ['click'],
  template: `
    <button
      v-bind="$attrs"
      :data-to="to == null ? '' : JSON.stringify(to)"
      :data-color="color ?? ''"
      :data-icon="icon"
      @click="$emit('click')"
    >
      <slot />
    </button>
  `,
}

describe('ViprTopbar', () => {
  it('renders a reusable back button contract', async () => {
    const wrapper = mount(ViprTopbar, {
      props: {
        topbarClass: 'send-topbar',
        buttonClass: 'send-topbar__back',
        buttonTestId: 'send-back-btn',
      },
      global: {
        stubs: {
          'q-btn': QBtnStub,
        },
      },
    })

    expect(wrapper.classes()).toContain('vipr-topbar')
    expect(wrapper.classes()).toContain('send-topbar')

    const button = wrapper.get('[data-testid="send-back-btn"]')
    expect(button.classes()).toContain('vipr-topbar__back')
    expect(button.classes()).toContain('send-topbar__back')
    expect(button.attributes('data-icon')).toBe('arrow_back')

    await button.trigger('click')

    expect(wrapper.emitted('back')).toHaveLength(1)
  })

  it('supports route targets, comfortable spacing, bleed buttons, and slots', () => {
    const wrapper = mount(ViprTopbar, {
      props: {
        backTo: { name: '/settings/' },
        buttonTestId: 'settings-back-btn',
        buttonColor: 'white',
        comfortable: true,
        bleed: true,
      },
      slots: {
        default: '<div data-testid="topbar-extra">extra</div>',
      },
      global: {
        stubs: {
          'q-btn': QBtnStub,
        },
      },
    })

    expect(wrapper.classes()).toContain('vipr-topbar--comfortable')
    expect(wrapper.find('[data-testid="topbar-extra"]').exists()).toBe(true)

    const button = wrapper.get('[data-testid="settings-back-btn"]')
    expect(button.classes()).toContain('vipr-topbar__back--bleed')
    expect(button.attributes('data-color')).toBe('white')
    expect(button.attributes('data-to')).toBe(JSON.stringify({ name: '/settings/' }))
  })
})
