import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { Quasar, Notify } from 'quasar'
import { createTestingPinia, type TestingPinia } from '@pinia/testing'
import AddFederation from 'src/components/AddFederation.vue'

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

  function createWrapper(): VueWrapper {
    return mount(AddFederation, {
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
})
