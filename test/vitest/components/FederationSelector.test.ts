import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createTestingPinia, type TestingPinia } from '@pinia/testing'
import FederationSelector from 'src/components/FederationSelector.vue'
import { useFederationStore } from 'src/stores/federation'
import { useWalletStore } from 'src/stores/wallet'
import type { Federation } from 'src/types/federation'

const createFederation = (overrides: Partial<Federation> = {}): Federation => ({
  title: 'E-Cash Club',
  inviteCode: 'fed11test',
  federationId: 'fed-1',
  modules: [],
  ...overrides,
})

describe('FederationSelector', () => {
  let wrapper: VueWrapper
  let pinia: TestingPinia

  const QDialogStub = {
    props: {
      modelValue: {
        type: Boolean,
        default: false,
      },
    },
    template: '<div v-if="modelValue"><slot /></div>',
  }

  const SlotStub = {
    template: '<div v-bind="$attrs"><slot /></div>',
  }

  function createWrapper(props: { selectable?: boolean } = {}) {
    const activeFederation = createFederation()
    const otherFederation = createFederation({
      title: 'Bitcoin Jungle',
      federationId: 'fed-2',
    })

    pinia = createTestingPinia({
      initialState: {
        federation: {
          federations: [activeFederation, otherFederation],
          selectedFederationId: 'fed-1',
        },
        wallet: {
          balance: 66,
        },
      },
      stubActions: true,
      createSpy: vi.fn,
    })

    return mount(FederationSelector, {
      props,
      global: {
        plugins: [pinia],
        stubs: {
          'q-dialog': QDialogStub,
          'q-icon': SlotStub,
          'q-spinner': SlotStub,
          ModalCard: SlotStub,
          FederationAvatar: true,
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the active federation and its live balance', () => {
    wrapper = createWrapper()

    expect(wrapper.text()).toContain('E-Cash Club')
    expect(wrapper.get('[data-testid="federation-active-balance"]').text()).toBe(
      'Available: 66 sats',
    )

    wrapper.unmount()
  })

  it('lists the active balance and hides inactive federation balances in the sheet', async () => {
    wrapper = createWrapper()

    await wrapper.get('[data-testid="federation-selector-trigger"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Active · 66 sats available')
    expect(wrapper.text()).toContain('Bitcoin Jungle')
    expect(wrapper.text()).toContain('Select to view balance')

    wrapper.unmount()
  })

  it('uses the existing federation store action when selecting another federation', async () => {
    wrapper = createWrapper()
    const federationStore = useFederationStore()
    const walletStore = useWalletStore()

    walletStore.balance = 66
    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(federationStore.selectFederation).mockResolvedValue(undefined)

    await wrapper.get('[data-testid="federation-selector-trigger"]').trigger('click')
    await wrapper.get('[data-testid="federation-option-fed-2"]').trigger('click')
    await flushPromises()

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(federationStore.selectFederation).toHaveBeenCalledWith(
      expect.objectContaining({
        federationId: 'fed-2',
        title: 'Bitcoin Jungle',
      }),
    )

    wrapper.unmount()
  })

  it('allows reselecting the active federation so the store can reopen a closed wallet', async () => {
    wrapper = createWrapper()
    const federationStore = useFederationStore()

    // eslint-disable-next-line @typescript-eslint/unbound-method
    vi.mocked(federationStore.selectFederation).mockResolvedValue(undefined)

    await wrapper.get('[data-testid="federation-selector-trigger"]').trigger('click')
    await wrapper.get('[data-testid="federation-option-fed-1"]').trigger('click')
    await flushPromises()

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(federationStore.selectFederation).toHaveBeenCalledWith(
      expect.objectContaining({
        federationId: 'fed-1',
        title: 'E-Cash Club',
      }),
    )

    wrapper.unmount()
  })

  it('keeps the active federation visible without opening the sheet when selection is disabled', async () => {
    wrapper = createWrapper({ selectable: false })
    const federationStore = useFederationStore()

    await wrapper.get('[data-testid="federation-selector-trigger"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('E-Cash Club')
    expect(wrapper.get('[data-testid="federation-selector-trigger"]').attributes('disabled')).toBe(
      '',
    )
    expect(wrapper.find('[data-testid="federation-option-fed-1"]').exists()).toBe(false)
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(federationStore.selectFederation).not.toHaveBeenCalled()

    wrapper.unmount()
  })
})
