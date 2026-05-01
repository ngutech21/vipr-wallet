import { describe, expect, it } from 'vitest'
import {
  getPositiveQueryInteger,
  getQueryInteger,
  getQueryString,
  getQueryStringOrEmpty,
} from 'src/utils/routeQuery'

describe('routeQuery', () => {
  it('returns the first string query value', () => {
    expect(getQueryString('one')).toBe('one')
    expect(getQueryString(['one', 'two'])).toBe('one')
    expect(getQueryString(undefined)).toBeNull()
  })

  it('returns an empty string fallback when requested', () => {
    expect(getQueryStringOrEmpty('value')).toBe('value')
    expect(getQueryStringOrEmpty(undefined)).toBe('')
  })

  it('parses integer query values with a fallback', () => {
    expect(getQueryInteger('42')).toBe(42)
    expect(getQueryInteger(['42'])).toBe(42)
    expect(getQueryInteger('invalid')).toBe(0)
    expect(getQueryInteger(undefined, 7)).toBe(7)
  })

  it('returns only positive integer query values', () => {
    expect(getPositiveQueryInteger('42')).toBe(42)
    expect(getPositiveQueryInteger('0')).toBeNull()
    expect(getPositiveQueryInteger('-1')).toBeNull()
    expect(getPositiveQueryInteger('invalid')).toBeNull()
  })
})
