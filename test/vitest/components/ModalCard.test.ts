import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ModalCard from 'src/components/ModalCard.vue'
import { PassthroughStub, QBtnStub } from '../mocks/quasar-stubs'

vi.mock('quasar', async (importOriginal) => {
  const actual = await importOriginal()
  return Object.assign({}, actual, {
    ClosePopup: {
      beforeMount: () => undefined,
      updated: () => undefined,
      unmounted: () => undefined,
    },
    TouchSwipe: {
      beforeMount: () => undefined,
      updated: () => undefined,
      unmounted: () => undefined,
    },
  })
})

function mountComponent(props: Partial<InstanceType<typeof ModalCard>['$props']> = {}) {
  return mount(ModalCard, {
    props: {
      title: 'Choose payment method',
      ...props,
    },
    slots: {
      default: '<div data-testid="modal-body-slot">Body content</div>',
      footer: '<button data-testid="modal-footer-action">Continue</button>',
    },
    global: {
      directives: {
        closePopup: {},
        touchSwipe: {},
      },
      stubs: {
        'q-card': PassthroughStub,
        'q-card-section': PassthroughStub,
        'q-card-actions': PassthroughStub,
        'q-separator': true,
        'q-btn': QBtnStub,
      },
    },
  })
}

describe('ModalCard.vue', () => {
  it('renders title, body slot, and footer slot', () => {
    const wrapper = mountComponent()

    expect(wrapper.text()).toContain('Choose payment method')
    expect(wrapper.find('[data-testid="modal-body-slot"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="modal-footer-action"]').exists()).toBe(true)
  })

  it('emits close from the default close button', async () => {
    const wrapper = mountComponent()

    await wrapper.get('[data-testid="modal-card-close-btn"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('emits back when the optional back button is shown', async () => {
    const wrapper = mountComponent({
      showBack: true,
      showClose: false,
    })

    expect(wrapper.find('[data-testid="modal-card-close-btn"]').exists()).toBe(false)
    await wrapper.get('[data-testid="modal-card-back-btn"]').trigger('click')

    expect(wrapper.emitted('back')).toHaveLength(1)
  })

  it('omits the footer container when no footer slot is provided', () => {
    const wrapper = mount(ModalCard, {
      props: {
        title: 'No footer',
      },
      slots: {
        default: '<div data-testid="modal-body-slot">Body content</div>',
      },
      global: {
        directives: {
          closePopup: {},
          touchSwipe: {},
        },
        stubs: {
          'q-card': PassthroughStub,
          'q-card-section': PassthroughStub,
          'q-card-actions': PassthroughStub,
          'q-separator': true,
          'q-btn': QBtnStub,
        },
      },
    })

    expect(wrapper.find('.modal-card__footer').exists()).toBe(false)
  })
})
