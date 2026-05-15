/* eslint-disable vue/one-component-per-file */
import { defineComponent } from 'vue'

export const PassthroughStub = defineComponent({
  name: 'PassthroughStub',
  template: '<div v-bind="$attrs"><slot /></div>',
})

export const QPageStub = defineComponent({
  name: 'QPageStub',
  template: '<main v-bind="$attrs"><slot /></main>',
})

export const QBtnStub = defineComponent({
  name: 'QBtn',
  props: {
    label: { type: String, required: false, default: '' },
    icon: { type: String, required: false, default: '' },
    disable: { type: Boolean, required: false, default: false },
    loading: { type: Boolean, required: false, default: false },
    to: { type: [String, Object], required: false, default: undefined },
  },
  emits: ['click'],
  template: `
    <button
      v-bind="$attrs"
      type="button"
      :disabled="disable || loading"
      :label="label"
      :icon="icon"
      :data-disabled="disable ? 'true' : 'false'"
      :data-busy="loading ? 'true' : 'false'"
      :data-to="to == null ? '' : typeof to === 'string' ? to : JSON.stringify(to)"
      @click="!disable && !loading && $emit('click')"
    >
      <slot>{{ label }}{{ icon }}</slot>
    </button>
  `,
})

export const QInputStub = defineComponent({
  name: 'QInput',
  inheritAttrs: false,
  props: {
    modelValue: { type: [String, Number], required: false, default: '' },
    type: { type: String, required: false, default: 'text' },
    errorMessage: { type: String, required: false, default: '' },
  },
  emits: ['update:modelValue'],
  template: `
    <label>
      <textarea
        v-if="type === 'textarea'"
        v-bind="$attrs"
        :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)"
      />
      <input
        v-else
        v-bind="$attrs"
        :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)"
      />
      <slot name="append" />
      <div v-if="errorMessage">{{ errorMessage }}</div>
    </label>
  `,
})
