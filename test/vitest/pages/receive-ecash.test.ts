/* eslint-disable vue/one-component-per-file */
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import ReceiveEcashPage from 'src/pages/receive-ecash.vue'
import { useWalletStore } from 'src/stores/wallet'

const mockRouterPush = vi.hoisted(() => vi.fn())
const mockNotify = vi.hoisted(() => vi.fn())
const mockLoadingShow = vi.hoisted(() => vi.fn())
const mockLoadingHide = vi.hoisted(() => vi.fn())
const routeState = vi.hoisted(() => ({
  query: {} as Record<string, string>,
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
  useRoute: () => routeState,
}))

vi.mock('quasar', async (importOriginal) => {
  const actual = await importOriginal()
  return Object.assign({}, actual, {
    useQuasar: () => ({
      notify: mockNotify,
    }),
    Loading: {
      show: mockLoadingShow,
      hide: mockLoadingHide,
    },
  })
})

const passthrough = defineComponent({
  template: '<div><slot /></div>',
})

const qBtnStub = defineComponent({
  name: 'QBtn',
  props: {
    label: {
      type: String,
      default: '',
    },
  },
  emits: ['click'],
  template: '<button @click="$emit(\'click\')">{{ label }}<slot /></button>',
})

describe('ReceiveEcashPage', () => {
  let wrapper: VueWrapper

  function createWrapper() {
    const pinia = createPinia()
    setActivePinia(pinia)

    return mount(ReceiveEcashPage, {
      global: {
        plugins: [pinia],
        stubs: {
          'q-page': passthrough,
          'q-toolbar': passthrough,
          'q-toolbar-title': passthrough,
          'q-card': passthrough,
          'q-card-section': passthrough,
          'q-btn': qBtnStub,
          'q-input': passthrough,
          'q-spinner-dots': passthrough,
        },
      },
    })
  }

  beforeEach(() => {
    routeState.query = {}
    vi.clearAllMocks()
    mockRouterPush.mockResolvedValue(undefined)
  })

  function setEcashToken(value: string) {
    ;(wrapper.vm as unknown as { ecashToken: string }).ecashToken = value
  }

  async function redeemEcash() {
    await (wrapper.vm as unknown as { redeemEcash: () => Promise<void> }).redeemEcash()
  }

  it('prefills token from route query when provided', async () => {
    routeState.query = { token: 'cashuAquery' }
    wrapper = createWrapper()
    await flushPromises()

    expect((wrapper.vm as unknown as { ecashToken: string }).ecashToken).toBe('cashuAquery')
    wrapper.unmount()
  })

  it('redeems ecash and navigates with the redeemed amount', async () => {
    wrapper = createWrapper()
    const walletStore = useWalletStore()

    const redeemEcashSpy = vi.spyOn(walletStore, 'redeemEcash').mockResolvedValue(12_000)
    setEcashToken('notes-1')

    await redeemEcash()

    expect(redeemEcashSpy).toHaveBeenCalledWith('notes-1')
    expect(mockRouterPush).toHaveBeenCalledWith({
      name: '/received-lightning',
      query: { amount: 12 },
    })
    wrapper.unmount()
  })

  it('does not navigate when redeem returns zero amount', async () => {
    wrapper = createWrapper()
    const walletStore = useWalletStore()

    vi.spyOn(walletStore, 'redeemEcash').mockResolvedValue(0)
    setEcashToken('notes-1')

    await redeemEcash()

    expect(mockRouterPush).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('shows a clean error when redeem fails', async () => {
    wrapper = createWrapper()
    const walletStore = useWalletStore()

    vi.spyOn(walletStore, 'redeemEcash').mockRejectedValue(new Error('invalid notes'))
    setEcashToken('bad-notes')

    await redeemEcash()
    await flushPromises()

    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'negative',
        message: 'Failed to redeem eCash: invalid notes',
      }),
    )

    wrapper.unmount()
  })
})
