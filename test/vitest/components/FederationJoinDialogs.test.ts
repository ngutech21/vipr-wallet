/* eslint-disable vue/one-component-per-file */
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import FederationJoinDialogs from 'src/components/FederationJoinDialogs.vue'
import { useFederationJoinFlow } from 'src/composables/useFederationJoinFlow'

const QDialogStub = defineComponent({
  name: 'QDialog',
  props: {
    modelValue: { type: Boolean, required: false, default: false },
  },
  emits: ['hide', 'update:modelValue'],
  watch: {
    modelValue(newValue: boolean, oldValue: boolean) {
      if (oldValue === true && newValue === false) {
        this.$emit('hide')
      }
    },
  },
  template: '<div v-if="modelValue"><slot /></div>',
})

const AddFederationSelectionStub = defineComponent({
  name: 'AddFederationSelection',
  emits: ['close', 'showDiscover', 'showAdd'],
  template: `
    <div data-testid="join-selection">
      <button data-testid="selection-discover-btn" @click="$emit('showDiscover')" />
      <button data-testid="selection-add-btn" @click="$emit('showAdd')" />
      <button data-testid="selection-close-btn" @click="$emit('close')" />
    </div>
  `,
})

const DiscoverFederationsStub = defineComponent({
  name: 'DiscoverFederations',
  props: {
    visible: { type: Boolean, required: true },
  },
  emits: ['close', 'showAdd'],
  template: `
    <div data-testid="discover-federations" :data-visible="visible ? 'true' : 'false'">
      <button
        data-testid="discover-preview-btn"
        @click="$emit('showAdd', { inviteCode: 'fed11preview' })"
      />
      <button data-testid="discover-close-btn" @click="$emit('close')" />
    </div>
  `,
})

const AddFederationStub = defineComponent({
  name: 'AddFederation',
  props: {
    backTarget: { type: String, required: false, default: 'invite' },
    initialInviteCode: { type: String, required: false, default: null },
    autoPreview: { type: Boolean, required: false, default: false },
  },
  emits: ['close', 'back'],
  template: `
    <div
      data-testid="add-federation"
      :data-back-target="backTarget"
      :data-invite-code="initialInviteCode"
      :data-auto-preview="autoPreview ? 'true' : 'false'"
    >
      <button data-testid="add-back-btn" @click="$emit('back')" />
      <button data-testid="add-close-btn" @click="$emit('close')" />
    </div>
  `,
})

function mountDialogs() {
  const flow = useFederationJoinFlow()
  const wrapper = mount(FederationJoinDialogs, {
    props: {
      flow,
    },
    global: {
      stubs: {
        QDialog: QDialogStub,
        AddFederationSelection: AddFederationSelectionStub,
        DiscoverFederations: DiscoverFederationsStub,
        AddFederation: AddFederationStub,
      },
    },
  })

  return { flow, wrapper }
}

describe('FederationJoinDialogs', () => {
  it('routes selection actions into the shared join flow', async () => {
    const { flow, wrapper } = mountDialogs()

    flow.openSelection()
    await flushPromises()

    await wrapper.get('[data-testid="selection-add-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="add-federation"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="add-federation"]').attributes()).toMatchObject({
      'data-back-target': 'invite',
      'data-auto-preview': 'false',
    })
  })

  it('opens a discovery preview after the discovery dialog closes', async () => {
    const { flow, wrapper } = mountDialogs()

    flow.openDiscover()
    await flushPromises()

    await wrapper.get('[data-testid="discover-preview-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="discover-federations"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="add-federation"]').attributes()).toMatchObject({
      'data-back-target': 'discover',
      'data-invite-code': 'fed11preview',
      'data-auto-preview': 'true',
    })
  })

  it('returns from a discovery preview back to discovery', async () => {
    const { flow, wrapper } = mountDialogs()

    flow.openAddFederationPreview({ inviteCode: 'fed11preview' })
    await flushPromises()

    await wrapper.get('[data-testid="add-back-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="add-federation"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="discover-federations"]').exists()).toBe(true)
  })
})
