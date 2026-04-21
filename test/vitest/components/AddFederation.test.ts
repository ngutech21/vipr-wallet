/* eslint-disable @typescript-eslint/unbound-method */
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { Loading, Notify, Quasar } from 'quasar'
import { createTestingPinia, type TestingPinia } from '@pinia/testing'
import AddFederation from 'src/components/AddFederation.vue'
import { useFederationStore } from 'src/stores/federation'
import { useWalletStore } from 'src/stores/wallet'
import type { Federation } from 'src/types/federation'

describe('AddFederation.vue', () => {
  let wrapper: VueWrapper | undefined
  let pinia: TestingPinia

  const mockNotify = vi.fn()

  const federation: Federation = {
    title: 'Trusted Federation',
    inviteCode: 'fed11trusted',
    federationId: 'trusted-fed-id',
    modules: [
      {
        kind: 'mint',
        config: 'mint-config',
        version: { major: 0, minor: 1 },
      },
    ],
    guardians: [
      {
        peerId: 0,
        name: 'Guardian One',
        url: 'wss://guardian.example',
      },
    ],
    metadata: {
      default_currency: 'USD',
      preview_message: 'Known federation preview message',
    },
    network: 'mainnet',
  }

  function setClipboardMock(readText: () => Promise<string>) {
    Object.defineProperty(navigator, 'clipboard', {
      value: { readText },
      configurable: true,
    })
  }

  function createWrapper(props: Record<string, unknown> = {}): VueWrapper {
    return mount(AddFederation, {
      props,
      global: {
        plugins: [Quasar, pinia],
        stubs: {
          ModalCard: defineComponent({
            name: 'ModalCard',
            props: {
              title: { type: String, required: false, default: '' },
              showBack: { type: Boolean, required: false, default: false },
              showClose: { type: Boolean, required: false, default: true },
            },
            emits: ['close', 'back'],
            template: `
              <div class="modal-card">
                <div data-testid="modal-title">{{ title }}</div>
                <button
                  v-if="showBack"
                  data-testid="modal-back-btn"
                  @click="$emit('back')"
                >
                  back
                </button>
                <button
                  v-if="showClose"
                  data-testid="modal-close-btn"
                  @click="$emit('close')"
                >
                  close
                </button>
                <slot />
                <slot name="footer" />
              </div>
            `,
          }),
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    Notify.create = mockNotify
    vi.spyOn(Loading, 'show').mockImplementation(() => () => undefined)
    vi.spyOn(Loading, 'hide').mockImplementation(() => undefined)

    pinia = createTestingPinia({
      initialState: {
        federation: {
          federations: [],
          selectedFederationId: null,
        },
      },
      stubActions: true,
      createSpy: vi.fn,
    })
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  it('starts on the invite step', () => {
    wrapper = createWrapper()

    expect(wrapper.text()).toContain('Enter or scan an invite code')
    expect(wrapper.find('[data-testid="join-federation-invite-step"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="add-federation-preview-btn"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="modal-back-btn"]').exists()).toBe(false)
  })

  it('pastes the invite code from the clipboard and uses it for preview', async () => {
    const readText = vi.fn().mockResolvedValue('fed11clipboard')
    const walletStore = useWalletStore()
    const previewFederationMock = walletStore.previewFederation as Mock
    previewFederationMock.mockResolvedValue(federation)
    setClipboardMock(readText)

    wrapper = createWrapper()

    await wrapper.get('[data-testid="add-federation-paste-btn"]').trigger('click')
    await wrapper.get('[data-testid="add-federation-preview-btn"]').trigger('click')
    await flushPromises()

    expect(readText).toHaveBeenCalledTimes(1)
    expect(previewFederationMock).toHaveBeenCalledWith('fed11clipboard')
    expect(wrapper.find('[data-testid="join-federation-preview-step"]').exists()).toBe(true)
  })

  it('shows a notification when clipboard access fails', async () => {
    const readText = vi.fn().mockRejectedValue(new Error('Permission denied'))
    setClipboardMock(readText)

    wrapper = createWrapper()
    await wrapper.get('[data-testid="add-federation-paste-btn"]').trigger('click')
    await flushPromises()

    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'negative',
        message: 'Unable to access clipboard Permission denied',
        position: 'top',
      }),
    )
  })

  it('loads the preview and switches to the review step', async () => {
    const walletStore = useWalletStore()
    const previewFederationMock = walletStore.previewFederation as Mock
    previewFederationMock.mockResolvedValue(federation)

    wrapper = createWrapper()
    await wrapper
      .findComponent({ name: 'JoinFederationInviteStep' })
      .vm.$emit('update:inviteCode', federation.inviteCode)
    await wrapper.get('[data-testid="add-federation-preview-btn"]').trigger('click')
    await flushPromises()

    expect(previewFederationMock).toHaveBeenCalledWith(federation.inviteCode)
    expect(wrapper.find('[data-testid="join-federation-preview-step"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Review this federation before you join')
    expect(wrapper.find('[data-testid="modal-back-btn"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="add-federation-submit-btn"]').exists()).toBe(true)
  })

  it('returns to the invite step when back is pressed from the review step', async () => {
    const walletStore = useWalletStore()
    ;(walletStore.previewFederation as Mock).mockResolvedValue(federation)

    wrapper = createWrapper()
    await wrapper
      .findComponent({ name: 'JoinFederationInviteStep' })
      .vm.$emit('update:inviteCode', federation.inviteCode)
    await wrapper.get('[data-testid="add-federation-preview-btn"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="modal-back-btn"]').trigger('click')

    expect(wrapper.find('[data-testid="join-federation-invite-step"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="join-federation-preview-step"]').exists()).toBe(false)
  })

  it('emits back when preview was opened from discovery', async () => {
    const walletStore = useWalletStore()
    ;(walletStore.previewFederation as Mock).mockResolvedValue(federation)

    wrapper = createWrapper({
      initialInviteCode: federation.inviteCode,
      autoPreview: true,
      backTarget: 'discover',
    })
    await flushPromises()
    await wrapper.get('[data-testid="modal-back-btn"]').trigger('click')

    expect(wrapper.emitted('back')).toHaveLength(1)
    expect(wrapper.find('[data-testid="join-federation-preview-step"]').exists()).toBe(true)
  })

  it('opens directly in the review step when prefetched federation data is provided', async () => {
    const walletStore = useWalletStore()
    const previewFederationMock = walletStore.previewFederation as Mock

    wrapper = createWrapper({
      initialInviteCode: federation.inviteCode,
      initialPreviewFederation: federation,
      autoPreview: true,
    })
    await flushPromises()

    expect(wrapper.find('[data-testid="join-federation-preview-step"]').exists()).toBe(true)
    expect(previewFederationMock).not.toHaveBeenCalled()
  })

  it('joins the federation and closes when review is confirmed', async () => {
    const walletStore = useWalletStore()
    const federationStore = useFederationStore()
    const previewFederationMock = walletStore.previewFederation as Mock
    const addFederationMock = federationStore.addFederation as Mock
    const selectFederationMock = federationStore.selectFederation as Mock

    previewFederationMock.mockResolvedValue(federation)
    selectFederationMock.mockResolvedValue(undefined)

    wrapper = createWrapper()
    await wrapper
      .findComponent({ name: 'JoinFederationInviteStep' })
      .vm.$emit('update:inviteCode', federation.inviteCode)
    await wrapper.get('[data-testid="add-federation-preview-btn"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="add-federation-submit-btn"]').trigger('click')
    await flushPromises()

    expect(addFederationMock).toHaveBeenCalledWith(federation)
    expect(selectFederationMock).toHaveBeenCalledWith(federation)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('rolls back the add when selecting the federation fails', async () => {
    const walletStore = useWalletStore()
    const federationStore = useFederationStore()
    const previewFederationMock = walletStore.previewFederation as Mock
    const addFederationMock = federationStore.addFederation as Mock
    const selectFederationMock = federationStore.selectFederation as Mock
    const deleteFederationMock = federationStore.deleteFederation as Mock

    previewFederationMock.mockResolvedValue(federation)
    selectFederationMock.mockRejectedValue(new Error('Selection failed'))

    wrapper = createWrapper()
    await wrapper
      .findComponent({ name: 'JoinFederationInviteStep' })
      .vm.$emit('update:inviteCode', federation.inviteCode)
    await wrapper.get('[data-testid="add-federation-preview-btn"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="add-federation-submit-btn"]').trigger('click')
    await flushPromises()

    expect(addFederationMock).toHaveBeenCalledWith(federation)
    expect(deleteFederationMock).toHaveBeenCalledWith(federation.federationId)
    expect(wrapper.emitted('close')).toBeFalsy()
  })

  it('forwards the modal close event', async () => {
    wrapper = createWrapper()
    await wrapper.get('[data-testid="modal-close-btn"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
