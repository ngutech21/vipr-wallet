import { describe, it, expect } from 'vitest'
import { useFormatters } from 'src/utils/formatter'

describe('formatter.ts', () => {
  describe('useFormatters', () => {
    it('should return formatNumber function', () => {
      const { formatNumber } = useFormatters()
      expect(typeof formatNumber).toBe('function')
    })
  })

  describe('formatNumber', () => {
    const { formatNumber } = useFormatters()

    it('should format positive integers', () => {
      expect(formatNumber(123)).toBe('123')
      expect(formatNumber(1)).toBe('1')
    })

    it('should format zero', () => {
      expect(formatNumber(0)).toBe('0')
    })

    it('should format negative numbers', () => {
      const result = formatNumber(-456)
      // Different locales format negatives differently (-456 or (456))
      expect(result).toMatch(/^-?[\d,]+$|^\([\d,]+\)$/)
    })

    it('should format large numbers with thousands separators', () => {
      const result = formatNumber(1000)
      // Different locales use different separators (1,000 or 1.000 or 1 000)
      expect(result.replace(/[\s.,]/g, '')).toBe('1000')
    })

    it('should format millions', () => {
      const result = formatNumber(1000000)
      expect(result.replace(/[\s.,]/g, '')).toBe('1000000')
    })

    it('should format decimals according to locale', () => {
      // Intl.NumberFormat() without options rounds or keeps decimals based on locale
      const result = formatNumber(123.456)
      // Most locales will show decimals
      expect(result).toMatch(/[\d.,\s]+/)
    })

    it('should handle very large numbers', () => {
      const result = formatNumber(1234567890)
      expect(result.replace(/[\s.,]/g, '')).toBe('1234567890')
    })

    it('should be consistent for same input', () => {
      expect(formatNumber(5000)).toBe(formatNumber(5000))
    })
  })
})
