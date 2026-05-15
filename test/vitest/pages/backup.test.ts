import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import BackupIntroPage from 'src/pages/settings/backup.vue'
import { PassthroughStub, QBtnStub, QPageStub } from '../mocks/quasar-stubs'

const mockRouterPush = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}))

function mountPage() {
  return mount(BackupIntroPage, {
    global: {
      stubs: {
        ViprTopbar: {
          emits: ['back'],
          template:
            '<button data-testid="backup-intro-back-stub" @click="$emit(\'back\')">back</button>',
        },
        'q-page': QPageStub,
        'q-icon': true,
        'q-btn': QBtnStub,
        'q-card': PassthroughStub,
      },
    },
  })
}

describe('BackupIntroPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRouterPush.mockResolvedValue(undefined)
  })

  it('renders the backup warning contract', () => {
    const wrapper = mountPage()

    expect(wrapper.find('[data-testid="backup-intro-page"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="backup-intro-title"]').text()).toBe(
      'Save your recovery phrase',
    )
    expect(wrapper.text()).toContain('Save the join code for each federation')
    expect(wrapper.text()).toContain('Do not save it in screenshots')
  })

  it('navigates to recovery words from the primary action', async () => {
    const wrapper = mountPage()

    await wrapper.get('[data-testid="backup-intro-show-words-btn"]').trigger('click')

    expect(mockRouterPush).toHaveBeenCalledWith({ name: '/settings/backup-words' })
  })

  it('returns to settings from cancel and topbar back', async () => {
    const wrapper = mountPage()

    await wrapper.get('[data-testid="backup-intro-cancel-btn"]').trigger('click')
    await wrapper.get('[data-testid="backup-intro-back-stub"]').trigger('click')

    expect(mockRouterPush).toHaveBeenCalledWith({ name: '/settings/' })
    expect(mockRouterPush).toHaveBeenCalledTimes(2)
  })
})
