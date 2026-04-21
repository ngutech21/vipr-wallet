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
            emits: ['close'],
            template:
              '<div><button data-testid="modal-close" @click="$emit(\'close\')">close</button><h2>{{ title }}</h2><slot /></div>',
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
    await wrapper.get('[data-testid="join-discover-federation-card"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('showDiscover')).toHaveLength(1)
    expect(eventLog).toEqual(['close', 'showDiscover'])
  })

  it('emits close and showAdd when add action is triggered', async () => {
    const eventLog: string[] = []
    const wrapper = createWrapper(eventLog)
    await wrapper.get('[data-testid="join-trusted-federation-card"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('showAdd')).toHaveLength(1)
    expect(eventLog).toEqual(['close', 'showAdd'])
  })

  it('forwards the modal close event', async () => {
    const wrapper = createWrapper()

    await wrapper.get('[data-testid="modal-close"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
