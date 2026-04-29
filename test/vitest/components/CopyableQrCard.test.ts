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

describe('CopyableQrCard', () => {
  it('renders QR, copy input, and action buttons with stable test ids', async () => {
    const wrapper = mount(CopyableQrCard, {
      props: {
        value: 'lnbc123',
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
          'q-separator': true,
          'q-btn': QBtnStub,
        },
      },
    })

    expect(wrapper.find('[data-testid="receive-onchain-share-btn"]').exists()).toBe(false)
  })
})
