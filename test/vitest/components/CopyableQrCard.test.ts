import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CopyableQrCard from 'src/components/CopyableQrCard.vue'

const SlotStub = {
  template: '<div><slot /></div>',
}

const QBtnStub = {
  emits: ['click'],
  template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
}

const QDialogStub = {
  props: ['modelValue'],
  template: '<div v-if="modelValue"><slot /></div>',
}

describe('CopyableQrCard', () => {
  it('renders QR, copy input, and action buttons with stable test ids', async () => {
    const wrapper = mount(CopyableQrCard, {
      props: {
        value: 'lnbc123',
        heading: 'Receive payment',
        label: 'Invoice',
        inputAriaLabel: 'Lightning invoice',
        testIdPrefix: 'receive',
        containerTestId: 'receive-qr-container',
        inputTestId: 'receive-invoice-input',
        copyTestId: 'receive-copy-invoice-btn',
        shareTestId: 'receive-share-invoice-btn',
        onCopy: vi.fn(),
        onShare: vi.fn(),
      },
      global: {
        stubs: {
          QrcodeVue: {
            props: ['value'],
            template: '<div data-testid="qr-code-stub">{{ value }}</div>',
          },
          'q-card': SlotStub,
          'q-card-section': SlotStub,
          'q-dialog': QDialogStub,
          'q-separator': true,
          'q-btn': QBtnStub,
        },
      },
    })

    expect(wrapper.find('[data-testid="receive-qr-container"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="qr-code-stub"]').text()).toBe('lnbc123')
    expect(wrapper.get('[data-testid="receive-invoice-input"]').attributes('value')).toBe('lnbc123')
    expect(wrapper.get('[data-testid="receive-invoice-input"]').attributes('aria-label')).toBe(
      'Lightning invoice',
    )
    expect(wrapper.text()).toContain('Receive payment')
    expect(wrapper.text()).toContain('Invoice')

    await wrapper.get('[data-testid="receive-copy-invoice-btn"]').trigger('click')
    await wrapper.get('[data-testid="receive-share-invoice-btn"]').trigger('click')

    expect(wrapper.emitted('copy')).toHaveLength(1)
    expect(wrapper.emitted('share')).toHaveLength(1)
  })

  it('can hide the share button', () => {
    const wrapper = mount(CopyableQrCard, {
      props: {
        value: 'bitcoin-address',
        inputAriaLabel: 'Bitcoin address',
        testIdPrefix: 'receive-onchain',
        showShare: false,
      },
      global: {
        stubs: {
          QrcodeVue: true,
          'q-card': SlotStub,
          'q-card-section': SlotStub,
          'q-dialog': QDialogStub,
          'q-separator': true,
          'q-btn': QBtnStub,
        },
      },
    })

    expect(wrapper.find('[data-testid="receive-onchain-share-btn"]').exists()).toBe(false)
  })

  it('can render an actions-only card without exposing the value input', () => {
    const wrapper = mount(CopyableQrCard, {
      props: {
        value: 'fed11test',
        eyebrow: 'Invite',
        heading: 'Join this federation',
        description: 'Scan the QR code or share the invite with others.',
        inputAriaLabel: 'Federation invite code',
        testIdPrefix: 'federation-details-invite',
        showValue: false,
      },
      global: {
        stubs: {
          QrcodeVue: true,
          'q-card': SlotStub,
          'q-card-section': SlotStub,
          'q-dialog': QDialogStub,
          'q-separator': true,
          'q-btn': QBtnStub,
        },
      },
    })

    expect(wrapper.text()).toContain('Invite')
    expect(wrapper.text()).toContain('Join this federation')
    expect(wrapper.text()).toContain('Scan the QR code or share the invite with others.')
    expect(wrapper.find('[data-testid="federation-details-invite-input"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="federation-details-invite-copy-btn"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="federation-details-invite-qr-zoom-btn"]').exists()).toBe(
      false,
    )
  })

  it('opens a larger QR dialog when QR zoom is enabled and the QR code is clicked', async () => {
    const wrapper = mount(CopyableQrCard, {
      props: {
        value: 'fed11test',
        heading: 'Join this federation',
        inputAriaLabel: 'Federation invite code',
        testIdPrefix: 'federation-details-invite',
        enableQrZoom: true,
      },
      global: {
        stubs: {
          QrcodeVue: {
            props: ['value'],
            template: '<div data-testid="qr-code-stub">{{ value }}</div>',
          },
          'q-card': SlotStub,
          'q-card-section': SlotStub,
          'q-dialog': QDialogStub,
          'q-separator': true,
          'q-btn': QBtnStub,
        },
      },
    })

    expect(
      wrapper.find('[data-testid="federation-details-invite-qr-zoom-close-btn"]').exists(),
    ).toBe(false)

    await wrapper.get('[data-testid="federation-details-invite-qr-zoom-btn"]').trigger('click')

    expect(wrapper.text()).toContain('Join this federation')
    expect(
      wrapper.find('[data-testid="federation-details-invite-qr-zoom-close-btn"]').exists(),
    ).toBe(true)
    expect(wrapper.findAll('[data-testid="qr-code-stub"]')).toHaveLength(2)
  })
})
