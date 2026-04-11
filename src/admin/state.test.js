import { describe, test, beforeEach } from 'vitest'
import fc from 'fast-check'
import {
  getState,
  setCategories,
  upsertCategory,
  setProducts,
  upsertProduct,
  setUsers,
  upsertUser,
} from './state.js'

// Arbitrary for objects with a string _id plus arbitrary extra fields
const itemArb = fc.record({
  _id: fc.string({ minLength: 1 }),
  name: fc.string(),
})

function resetState() {
  setCategories([])
  setProducts([])
  setUsers([])
}

// Feature: admin-panel, Property 11: La lista se actualiza con los datos retornados por la API
// Validates: Requirements 4.7, 5.10, 6.11, 8.2, 8.4
describe('Property 11: La lista se actualiza con los datos retornados por la API', () => {
  beforeEach(resetState)

  // --- setX replaces the list ---

  test('setCategories reemplaza la lista completa', () => {
    fc.assert(
      fc.property(fc.array(itemArb), (list) => {
        setCategories(list)
        return getState().categories === list
      }),
      { numRuns: 100 }
    )
  })

  test('setProducts reemplaza la lista completa', () => {
    fc.assert(
      fc.property(fc.array(itemArb), (list) => {
        setProducts(list)
        return getState().products === list
      }),
      { numRuns: 100 }
    )
  })

  test('setUsers reemplaza la lista completa', () => {
    fc.assert(
      fc.property(fc.array(itemArb), (list) => {
        setUsers(list)
        return getState().users === list
      }),
      { numRuns: 100 }
    )
  })

  // --- upsertX: existing item is replaced by _id ---

  test('upsertCategory reemplaza el item existente por _id', () => {
    fc.assert(
      fc.property(
        fc.array(itemArb, { minLength: 1 }),
        fc.nat(),
        fc.string(),
        (list, idxRaw, newName) => {
          const idx = idxRaw % list.length
          const original = list[idx]
          setCategories([...list])

          const updated = { ...original, name: newName }
          upsertCategory(updated)

          const state = getState()
          const found = state.categories.find(c => c._id === original._id)
          return (
            found !== undefined &&
            found.name === newName &&
            state.categories.length === list.length
          )
        }
      ),
      { numRuns: 100 }
    )
  })

  test('upsertProduct reemplaza el item existente por _id', () => {
    fc.assert(
      fc.property(
        fc.array(itemArb, { minLength: 1 }),
        fc.nat(),
        fc.string(),
        (list, idxRaw, newName) => {
          const idx = idxRaw % list.length
          const original = list[idx]
          setProducts([...list])

          const updated = { ...original, name: newName }
          upsertProduct(updated)

          const state = getState()
          const found = state.products.find(p => p._id === original._id)
          return (
            found !== undefined &&
            found.name === newName &&
            state.products.length === list.length
          )
        }
      ),
      { numRuns: 100 }
    )
  })

  test('upsertUser reemplaza el item existente por _id', () => {
    fc.assert(
      fc.property(
        fc.array(itemArb, { minLength: 1 }),
        fc.nat(),
        fc.string(),
        (list, idxRaw, newName) => {
          const idx = idxRaw % list.length
          const original = list[idx]
          setUsers([...list])

          const updated = { ...original, name: newName }
          upsertUser(updated)

          const state = getState()
          const found = state.users.find(u => u._id === original._id)
          return (
            found !== undefined &&
            found.name === newName &&
            state.users.length === list.length
          )
        }
      ),
      { numRuns: 100 }
    )
  })

  // --- upsertX: new item is inserted at the beginning ---

  test('upsertCategory inserta al inicio si el _id no existe', () => {
    fc.assert(
      fc.property(
        fc.array(itemArb),
        itemArb,
        (list, newItem) => {
          // Ensure newItem._id is not in list
          const cleanList = list.filter(c => c._id !== newItem._id)
          setCategories([...cleanList])

          upsertCategory(newItem)

          const state = getState()
          return (
            state.categories[0]._id === newItem._id &&
            state.categories.length === cleanList.length + 1
          )
        }
      ),
      { numRuns: 100 }
    )
  })

  test('upsertProduct inserta al inicio si el _id no existe', () => {
    fc.assert(
      fc.property(
        fc.array(itemArb),
        itemArb,
        (list, newItem) => {
          const cleanList = list.filter(p => p._id !== newItem._id)
          setProducts([...cleanList])

          upsertProduct(newItem)

          const state = getState()
          return (
            state.products[0]._id === newItem._id &&
            state.products.length === cleanList.length + 1
          )
        }
      ),
      { numRuns: 100 }
    )
  })

  test('upsertUser inserta al inicio si el _id no existe', () => {
    fc.assert(
      fc.property(
        fc.array(itemArb),
        itemArb,
        (list, newItem) => {
          const cleanList = list.filter(u => u._id !== newItem._id)
          setUsers([...cleanList])

          upsertUser(newItem)

          const state = getState()
          return (
            state.users[0]._id === newItem._id &&
            state.users.length === cleanList.length + 1
          )
        }
      ),
      { numRuns: 100 }
    )
  })
})
