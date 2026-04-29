import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SettingsSection from 'src/components/settings/SettingsSection.vue'

const QExpansionItemStub = {
  props: ['icon', 'label', 'caption', 'headerClass', 'expandIconClass'],
  template: `
    <section
      v-bind="$attrs"
      :data-icon="icon"
      :data-label="label"
      :data-caption="caption"
      :data-header-class="String(headerClass)"
      :data-expand-icon-class="expandIconClass"
    >
      <slot name="header" />
      <slot />
    </section>
  `,
}

const SlotStub = {
  template: '<div v-bind="$attrs"><slot /></div>',
}

describe('SettingsSection', () => {
  it('wraps content in the standard settings section structure', () => {
    const wrapper = mount(SettingsSection, {
      props: {
        icon: 'update',
        label: 'Updates',
        caption: 'Check for updates',
        variant: 'secondary',
      },
      attrs: {
        'data-testid': 'settings-updates-section',
      },
      slots: {
        default: '<button data-testid="section-action">Action</button>',
      },
      global: {
        stubs: {
          'q-expansion-item': QExpansionItemStub,
          'q-card': SlotStub,
          'q-card-section': SlotStub,
        },
      },
    })

    const section = wrapper.get('[data-testid="settings-updates-section"]')
    expect(section.classes()).toContain('settings-section')
    expect(section.classes()).toContain('settings-section--secondary')
    expect(section.attributes('data-icon')).toBe('update')
    expect(section.attributes('data-label')).toBe('Updates')
    expect(section.attributes('data-caption')).toBe('Check for updates')
    expect(section.attributes('data-header-class')).toContain('settings-header')
    expect(wrapper.get('.settings-panel').classes()).toContain('settings-panel--secondary')
    expect(wrapper.find('[data-testid="section-action"]').exists()).toBe(true)
  })

  it('supports danger and compact variants', () => {
    const wrapper = mount(SettingsSection, {
      props: {
        variant: 'danger',
        compact: true,
        label: 'Reset',
      },
      global: {
        stubs: {
          'q-expansion-item': QExpansionItemStub,
          'q-card': SlotStub,
          'q-card-section': SlotStub,
        },
      },
    })

    expect(wrapper.get('section').classes()).toContain('settings-section--danger')
    expect(wrapper.get('section').attributes('data-header-class')).toContain('danger-header')
    expect(wrapper.get('.settings-panel').classes()).toContain('settings-panel--danger')
    expect(wrapper.get('.settings-panel').classes()).toContain('settings-panel--compact')
  })
})
