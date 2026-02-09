import { describe, it, expect } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { Quasar } from 'quasar'
import AddFederationSelection from 'src/components/AddFederationSelection.vue'

describe('AddFederationSelection.vue', () => {
  function createWrapper(eventLog?: string[]) {
    return mount(AddFederationSelection, {
      attrs: {
        onClose: () => eventLog?.push('close'),
        onShowDiscover: () => eventLog?.push('showDiscover'),
        onShowAdd: () => eventLog?.push('showAdd'),
      },
      global: {
        plugins: [Quasar],
        stubs: {
          ModalCard: defineComponent({
            name: 'ModalCard',
            props: {
              title: { type: String, required: false, default: '' },
            },
            template: '<div><h2>{{ title }}</h2><slot /></div>',
          }),
        },
      },
    })
  }

  it('renders federation selection modal', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('Discover federations')
    expect(wrapper.text()).toContain('Join a trusted federation')
  })

  it('emits close and showDiscover when discover action is triggered', async () => {
    const eventLog: string[] = []
    const wrapper = createWrapper(eventLog)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wrapper.vm as any).onDiscover()

    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('showDiscover')).toHaveLength(1)
    expect(eventLog).toEqual(['close', 'showDiscover'])
  })

  it('emits close and showAdd when add action is triggered', async () => {
    const eventLog: string[] = []
    const wrapper = createWrapper(eventLog)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wrapper.vm as any).onAdd()

    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('showAdd')).toHaveLength(1)
    expect(eventLog).toEqual(['close', 'showAdd'])
  })
})
