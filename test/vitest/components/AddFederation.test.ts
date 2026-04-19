import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { Quasar, Notify } from 'quasar'
import { createTestingPinia, type TestingPinia } from '@pinia/testing'
import AddFederation from 'src/components/AddFederation.vue'
import { useWalletStore } from 'src/stores/wallet'
import type { Federation } from 'src/components/models'

describe('AddFederation.vue', () => {
  let wrapper: VueWrapper | undefined
  let pinia: TestingPinia
  const mockNotify = vi.fn()
  Notify.create = mockNotify

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
            },
            template: '<div><h2>{{ title }}</h2><slot /></div>',
          }),
        },
      },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
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

  it('pastes invite code from clipboard on success', async () => {
    const readText = vi.fn().mockResolvedValue('fed11abc')
    setClipboardMock(readText)

    wrapper = createWrapper()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wrapper.vm as any).pasteFromClipboard()
    await flushPromises()

    expect(readText).toHaveBeenCalledTimes(1)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((wrapper.vm as any).inviteCode).toBe('fed11abc')
    expect(mockNotify).not.toHaveBeenCalled()
  })

  it('shows notification when clipboard access fails', async () => {
    const readText = vi.fn().mockRejectedValue(new Error('Permission denied'))
    setClipboardMock(readText)

    wrapper = createWrapper()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (wrapper.vm as any).pasteFromClipboard()
    await flushPromises()

    expect(readText).toHaveBeenCalledTimes(1)
    expect(mockNotify).toHaveBeenCalledWith({
      type: 'negative',
      message: 'Unable to access clipboard Permission denied',
      position: 'top',
    })
  })

  it('opens directly in preview step when prefetched federation is provided', async () => {
    const walletStore = useWalletStore()
    const federation: Federation = {
      title: 'Cached Federation',
      inviteCode: 'fed11cached',
      federationId: 'cached-fed-id',
      modules: [],
      metadata: {},
    }

    wrapper = createWrapper({
      initialInviteCode: federation.inviteCode,
      initialPreviewFederation: federation,
      autoPreview: true,
    })
    await flushPromises()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((wrapper.vm as any).step).toBe('preview')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((wrapper.vm as any).previewFederation).toEqual(federation)
    expect(
      (
        walletStore as unknown as {
          previewFederation: { mock: { calls: unknown[] } }
        }
      ).previewFederation.mock.calls,
    ).toHaveLength(0)
  })
})
