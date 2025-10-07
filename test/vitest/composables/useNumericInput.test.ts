import { describe, it, expect } from 'vitest'
import { useNumericInput } from 'src/composables/useNumericInput'

describe('useNumericInput', () => {
  describe('appendDigit', () => {
    it('should append digits correctly', () => {
      const { value, appendDigit } = useNumericInput()

      appendDigit(1)
      expect(value.value).toBe(1)

      appendDigit(2)
      expect(value.value).toBe(12)

      appendDigit(3)
      expect(value.value).toBe(123)
    })

    it('should append zero correctly', () => {
      const { value, appendDigit } = useNumericInput()

      appendDigit(5)
      appendDigit(0)
      appendDigit(0)

      expect(value.value).toBe(500)
    })

    it('should handle leading zeros', () => {
      const { value, appendDigit } = useNumericInput()

      appendDigit(0)
      appendDigit(0)
      appendDigit(5)

      expect(value.value).toBe(5)
    })
  })

  describe('deleteLastDigit', () => {
    it('should delete the last digit', () => {
      const { value, appendDigit, deleteLastDigit } = useNumericInput()

      appendDigit(1)
      appendDigit(2)
      appendDigit(3)

      deleteLastDigit()
      expect(value.value).toBe(12)

      deleteLastDigit()
      expect(value.value).toBe(1)
    })

    it('should set to zero when deleting last digit', () => {
      const { value, appendDigit, deleteLastDigit } = useNumericInput()

      appendDigit(5)
      deleteLastDigit()

      expect(value.value).toBe(0)
    })

    it('should not go below zero', () => {
      const { value, deleteLastDigit } = useNumericInput()

      deleteLastDigit()
      deleteLastDigit()

      expect(value.value).toBe(0)
    })
  })

  describe('clear', () => {
    it('should clear the value to zero', () => {
      const { value, appendDigit, clear } = useNumericInput()

      appendDigit(1)
      appendDigit(2)
      appendDigit(3)

      clear()

      expect(value.value).toBe(0)
    })
  })

  describe('setValue', () => {
    it('should set value directly', () => {
      const { value, setValue } = useNumericInput()

      setValue(999)

      expect(value.value).toBe(999)
    })
  })

  describe('initialValue', () => {
    it('should use provided initial value', () => {
      const { value } = useNumericInput(42)

      expect(value.value).toBe(42)
    })

    it('should default to zero when no initial value', () => {
      const { value } = useNumericInput()

      expect(value.value).toBe(0)
    })
  })

  describe('keypadButtons', () => {
    it('should provide 12 keypad buttons', () => {
      const { keypadButtons } = useNumericInput()

      expect(keypadButtons.value).toHaveLength(12)
    })

    it('should have buttons for digits 0-9', () => {
      const { keypadButtons } = useNumericInput()

      const digitButtons = keypadButtons.value.filter((btn) => btn.label != null)

      expect(digitButtons).toHaveLength(10)
    })

    it('should have clear and backspace buttons', () => {
      const { keypadButtons } = useNumericInput()

      const clearButton = keypadButtons.value.find((btn) => btn.icon === 'clear')
      const backspaceButton = keypadButtons.value.find((btn) => btn.icon === 'backspace')

      expect(clearButton).toBeDefined()
      expect(backspaceButton).toBeDefined()
    })

    it('should execute handlers correctly', () => {
      const { value, keypadButtons } = useNumericInput()

      // Click button 1
      const button1 = keypadButtons.value.find((btn) => btn.label === '1')
      button1?.handler()

      expect(value.value).toBe(1)

      // Click button 5
      const button5 = keypadButtons.value.find((btn) => btn.label === '5')
      button5?.handler()

      expect(value.value).toBe(15)

      // Click backspace
      const backspace = keypadButtons.value.find((btn) => btn.icon === 'backspace')
      backspace?.handler()

      expect(value.value).toBe(1)

      // Click clear
      const clear = keypadButtons.value.find((btn) => btn.icon === 'clear')
      clear?.handler()

      expect(value.value).toBe(0)
    })
  })
})
