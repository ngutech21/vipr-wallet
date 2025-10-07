import { ref, computed } from 'vue'

export interface KeypadButton {
  label?: string
  icon?: string
  handler: () => void
}

/**
 * Composable for handling numeric keypad input
 * Useful for amount entry in forms
 */
export function useNumericInput(initialValue = 0) {
  const value = ref<number>(initialValue)

  /**
   * Append a digit to the current value
   * @param digit - Single digit (0-9) to append
   */
  function appendDigit(digit: number) {
    const currentAmount = value.value ?? 0
    // Remove any decimals and append the digit
    const newValue = Number(currentAmount.toString().replace(/\.\d*$/, '') + digit.toString())
    value.value = newValue
  }

  /**
   * Delete the last digit from the current value
   */
  function deleteLastDigit() {
    if (value.value === 0) return

    let currentAmount = value.value.toString()
    currentAmount = currentAmount.slice(0, -1)
    value.value = currentAmount !== '' ? Number(currentAmount) : 0
  }

  /**
   * Clear the value (set to 0)
   */
  function clear() {
    value.value = 0
  }

  /**
   * Set the value directly
   * @param newValue - New value to set
   */
  function setValue(newValue: number) {
    value.value = newValue
  }

  /**
   * Keypad buttons configuration for a standard numeric keypad
   * Ready to use with Quasar buttons or similar UI components
   */
  const keypadButtons = computed<KeypadButton[]>(() => [
    // First row (1-3)
    { label: '1', handler: () => appendDigit(1) },
    { label: '2', handler: () => appendDigit(2) },
    { label: '3', handler: () => appendDigit(3) },

    // Second row (4-6)
    { label: '4', handler: () => appendDigit(4) },
    { label: '5', handler: () => appendDigit(5) },
    { label: '6', handler: () => appendDigit(6) },

    // Third row (7-9)
    { label: '7', handler: () => appendDigit(7) },
    { label: '8', handler: () => appendDigit(8) },
    { label: '9', handler: () => appendDigit(9) },

    // Fourth row (special buttons and 0)
    { icon: 'clear', handler: clear },
    { label: '0', handler: () => appendDigit(0) },
    { icon: 'backspace', handler: deleteLastDigit },
  ])

  return {
    value,
    appendDigit,
    deleteLastDigit,
    clear,
    setValue,
    keypadButtons,
  }
}
