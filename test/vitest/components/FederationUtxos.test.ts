import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import FederationUtxos from 'src/components/FederationUtxos.vue'
import type { FederationUtxo } from 'src/types/federation'
import { PassthroughStub, QBtnStub } from '../mocks/quasar-stubs'

const quasarState = reactive({
  screen: {
    lt: {
      sm: false,
    },
  },
})

vi.mock('quasar', async (importOriginal) => {
  const actual = await importOriginal()
  return Object.assign({}, actual, {
    useQuasar: () => quasarState,
  })
})

function createUtxos(count: number): FederationUtxo[] {
  return Array.from({ length: count }, (_, index) => ({
    txid: `txid-${index + 1}`,
    vout: index,
    amount: (index + 1) * 1_000,
  }))
}

function mountComponent(props: {
  utxos?: FederationUtxo[]
  isLoading?: boolean
  error?: string | null
  network?: string | null
}) {
  const componentProps: {
    utxos: FederationUtxo[]
    isLoading: boolean
    error: string | null
    network?: string | null
  } = {
    utxos: props.utxos ?? [],
    isLoading: props.isLoading ?? false,
    error: props.error ?? null,
  }
  if (props.network !== undefined) {
    componentProps.network = props.network
  }

  return mount(FederationUtxos, {
    props: componentProps,
    global: {
      stubs: {
        'q-icon': true,
        'q-spinner': true,
        'q-btn': QBtnStub,
      },
    },
  })
}

describe('FederationUtxos.vue', () => {
  beforeEach(() => {
    quasarState.screen.lt.sm = false
  })

  it('starts collapsed and expands to show desktop UTXOs with mempool links', async () => {
    const wrapper = mountComponent({
      utxos: createUtxos(12),
      network: 'signet',
    })

    expect(wrapper.get('.utxo-header').attributes('aria-expanded')).toBe('false')

    await wrapper.get('.utxo-header').trigger('click')

    expect(wrapper.get('.utxo-header').attributes('aria-expanded')).toBe('true')
    const rows = wrapper.findAll('.utxo-row')
    expect(rows).toHaveLength(10)
    expect(rows[0]?.attributes('href')).toBe('https://mempool.space/signet/tx/txid-1')
    expect(wrapper.text()).toContain('12 spendable')
    expect(wrapper.get('[data-label^="Show more"]').attributes('data-label')).toBe('Show more (2)')
  })

  it('uses the mobile visible count and toggles show more/show less', async () => {
    quasarState.screen.lt.sm = true
    const wrapper = mountComponent({
      utxos: createUtxos(6),
      network: 'testnet4',
    })

    await wrapper.get('.utxo-header').trigger('click')
    expect(wrapper.findAll('.utxo-row')).toHaveLength(4)
    expect(wrapper.find('.utxo-row').attributes('href')).toBe(
      'https://mempool.space/testnet4/tx/txid-1',
    )

    await wrapper.get('[data-label^="Show more"]').trigger('click')
    expect(wrapper.findAll('.utxo-row')).toHaveLength(6)
    expect(wrapper.find('[data-label="Show less"]').exists()).toBe(true)

    await wrapper.get('[data-label="Show less"]').trigger('click')
    expect(wrapper.findAll('.utxo-row')).toHaveLength(4)
  })

  it('resets the expanded list when the UTXO set changes', async () => {
    quasarState.screen.lt.sm = true
    const wrapper = mountComponent({
      utxos: createUtxos(6),
    })

    await wrapper.get('.utxo-header').trigger('click')
    await wrapper.get('[data-label^="Show more"]').trigger('click')
    expect(wrapper.findAll('.utxo-row')).toHaveLength(6)

    await wrapper.setProps({
      utxos: createUtxos(5),
    })

    expect(wrapper.findAll('.utxo-row')).toHaveLength(4)
  })

  it('shows loading, error, and empty states without UTXO links', async () => {
    const loadingWrapper = mountComponent({ isLoading: true })
    await loadingWrapper.get('.utxo-header').trigger('click')
    expect(loadingWrapper.findComponent(PassthroughStub).exists()).toBe(false)
    expect(loadingWrapper.find('.utxo-loading').exists()).toBe(true)
    expect(loadingWrapper.find('.utxo-row').exists()).toBe(false)

    const errorWrapper = mountComponent({ error: 'Unable to load UTXOs' })
    await errorWrapper.get('.utxo-header').trigger('click')
    expect(errorWrapper.text()).toContain('Unable to load UTXOs')
    expect(errorWrapper.find('.utxo-row').exists()).toBe(false)

    const emptyWrapper = mountComponent({ utxos: [] })
    await emptyWrapper.get('.utxo-header').trigger('click')
    expect(emptyWrapper.text()).toContain('No spendable UTXOs available.')
    expect(emptyWrapper.find('.utxo-row').exists()).toBe(false)
  })
})
