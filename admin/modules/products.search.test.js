// products.js pulls in Bootstrap and Jodit, which touch `document` at import
// time, so this suite needs a DOM environment.
// @vitest-environment jsdom

import { describe, test, expect } from 'vitest'
import { matchesSearch, filterProducts } from './products.js'

const product = {
  _id: '1',
  title: 'LG Front-Load Ultra Capacity Washer',
  category: 'Washers',
  description: '<p>Great <strong>condition</strong>, barely used</p>',
  price: 549.99,
  active: true,
}

describe('product search filter', () => {
  test('empty or whitespace query matches everything', () => {
    expect(matchesSearch(product, '')).toBe(true)
    expect(matchesSearch(product, '   ')).toBe(true)
  })

  test('matches on title, case-insensitively', () => {
    expect(matchesSearch(product, 'washer')).toBe(true)
    expect(matchesSearch(product, 'WASHER')).toBe(true)
    expect(matchesSearch(product, 'Ultra')).toBe(true)
  })

  test('matches on category', () => {
    expect(matchesSearch(product, 'washers')).toBe(true)
  })

  test('matches on price', () => {
    expect(matchesSearch(product, '549')).toBe(true)
  })

  test('matches on status keyword', () => {
    expect(matchesSearch(product, 'active')).toBe(true)
    expect(matchesSearch({ ...product, active: false }, 'inactive')).toBe(true)
  })

  test('searches description as plain text, ignoring HTML tags', () => {
    expect(matchesSearch(product, 'condition')).toBe(true)
    // Tag names must not be matchable.
    expect(matchesSearch(product, 'strong')).toBe(false)
  })

  test('all terms must match (AND, not OR)', () => {
    expect(matchesSearch(product, 'lg washer')).toBe(true)
    expect(matchesSearch(product, 'lg dryer')).toBe(false)
  })

  test('ignores accents in both query and data', () => {
    const p = { ...product, title: 'Estufa Eléctrica' }
    expect(matchesSearch(p, 'electrica')).toBe(true)
    expect(matchesSearch(p, 'eléctrica')).toBe(true)
  })

  test('non-matching query returns false', () => {
    expect(matchesSearch(product, 'refrigerator')).toBe(false)
  })

  test('tolerates missing fields', () => {
    expect(matchesSearch({ _id: 'x' }, 'anything')).toBe(false)
    expect(matchesSearch({ _id: 'x' }, '')).toBe(true)
    expect(matchesSearch({ _id: 'x', title: null, price: null }, '')).toBe(true)
  })
})

describe('grid visibility filter', () => {
  const list = [
    { _id: '1', title: 'LG Washer', category: 'Washers', active: true },
    { _id: '2', title: 'LG Dryer', category: 'Dryers', active: false },
    { _id: '3', title: 'Maytag Washer', category: 'Washers', active: true },
    { _id: '4', title: 'Samsung Fridge', category: 'Fridges', active: false },
  ]

  test('hides inactive products by default', () => {
    const result = filterProducts(list)
    expect(result.map(p => p._id)).toEqual(['1', '3'])
  })

  test('includes inactive products when requested', () => {
    const result = filterProducts(list, { includeInactive: true })
    expect(result).toHaveLength(4)
  })

  test('combines visibility with search', () => {
    // "lg" matches an active and an inactive product; only the active one shows.
    expect(filterProducts(list, { term: 'lg' }).map(p => p._id)).toEqual(['1'])
    expect(
      filterProducts(list, { term: 'lg', includeInactive: true }).map(p => p._id)
    ).toEqual(['1', '2'])
  })

  test('treats missing active field as inactive', () => {
    const odd = [{ _id: 'x', title: 'No status' }]
    expect(filterProducts(odd)).toHaveLength(0)
    expect(filterProducts(odd, { includeInactive: true })).toHaveLength(1)
  })

  test('tolerates non-array input', () => {
    expect(filterProducts(undefined)).toEqual([])
    expect(filterProducts(null)).toEqual([])
  })

  test('does not mutate the input list', () => {
    const copy = [...list]
    filterProducts(list, { term: 'washer' })
    expect(list).toEqual(copy)
  })
})
