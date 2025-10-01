import { describe, it, expect } from 'vitest'
import { getErrorMessage } from 'src/utils/error'

describe('error.ts', () => {
  describe('getErrorMessage', () => {
    it('should return error message from Error instance', () => {
      const error = new Error('Something went wrong')
      expect(getErrorMessage(error)).toBe('Something went wrong')
    })

    it('should return error message from TypeError instance', () => {
      const error = new TypeError('Type error occurred')
      expect(getErrorMessage(error)).toBe('Type error occurred')
    })

    it('should convert string to string', () => {
      expect(getErrorMessage('String error')).toBe('String error')
    })

    it('should convert number to string', () => {
      expect(getErrorMessage(404)).toBe('404')
      expect(getErrorMessage(0)).toBe('0')
      expect(getErrorMessage(-1)).toBe('-1')
    })

    it('should convert boolean to string', () => {
      expect(getErrorMessage(true)).toBe('true')
      expect(getErrorMessage(false)).toBe('false')
    })

    it('should convert null to string', () => {
      expect(getErrorMessage(null)).toBe('null')
    })

    it('should convert undefined to string', () => {
      expect(getErrorMessage(undefined)).toBe('undefined')
    })

    it('should convert object to string', () => {
      const obj = { code: 500, message: 'Server error' }
      expect(getErrorMessage(obj)).toBe('[object Object]')
    })

    it('should convert array to string', () => {
      const arr = ['error1', 'error2']
      expect(getErrorMessage(arr)).toBe('error1,error2')
    })
  })
})
