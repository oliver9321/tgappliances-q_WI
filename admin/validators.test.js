import { describe, test, expect } from 'vitest'
import fc from 'fast-check'
import {
  validatePrice,
  validateDiscount,
  validateQuantity,
  validateUsername,
  validateCategory,
  validateProduct,
  validateUser,
} from './validators.js'

// ─── Unit tests ───────────────────────────────────────────────────────────────

describe('validatePrice', () => {
  test('accepts empty/null/undefined', () => {
    expect(validatePrice('')).toBe(true)
    expect(validatePrice(null)).toBe(true)
    expect(validatePrice(undefined)).toBe(true)
  })
  test('accepts positive numbers', () => {
    expect(validatePrice(1)).toBe(true)
    expect(validatePrice(9.99)).toBe(true)
    expect(validatePrice('5.50')).toBe(true)
  })
  test('rejects zero', () => {
    expect(validatePrice(0)).toBe(false)
  })
  test('rejects negative numbers', () => {
    expect(validatePrice(-1)).toBe(false)
    expect(validatePrice('-5')).toBe(false)
  })
  test('rejects non-numeric strings', () => {
    expect(validatePrice('abc')).toBe(false)
    expect(validatePrice('12abc')).toBe(false)
  })
})

describe('validateDiscount', () => {
  test('accepts integers in [0, 100]', () => {
    expect(validateDiscount(0)).toBe(true)
    expect(validateDiscount(50)).toBe(true)
    expect(validateDiscount(100)).toBe(true)
  })
  test('rejects values outside [0, 100]', () => {
    expect(validateDiscount(-1)).toBe(false)
    expect(validateDiscount(101)).toBe(false)
  })
  test('rejects non-integers', () => {
    expect(validateDiscount(1.5)).toBe(false)
    expect(validateDiscount('abc')).toBe(false)
  })
  test('rejects empty/null/undefined', () => {
    expect(validateDiscount('')).toBe(false)
    expect(validateDiscount(null)).toBe(false)
    expect(validateDiscount(undefined)).toBe(false)
  })
})

describe('validateQuantity', () => {
  test('accepts non-negative integers', () => {
    expect(validateQuantity(0)).toBe(true)
    expect(validateQuantity(1)).toBe(true)
    expect(validateQuantity(100)).toBe(true)
  })
  test('rejects negative integers', () => {
    expect(validateQuantity(-1)).toBe(false)
  })
  test('rejects non-integers', () => {
    expect(validateQuantity(1.5)).toBe(false)
    expect(validateQuantity('abc')).toBe(false)
  })
  test('rejects empty/null/undefined', () => {
    expect(validateQuantity('')).toBe(false)
    expect(validateQuantity(null)).toBe(false)
    expect(validateQuantity(undefined)).toBe(false)
  })
})

describe('validateUsername', () => {
  test('accepts valid usernames', () => {
    expect(validateUsername('admin')).toBe(true)
    expect(validateUsername('user_1')).toBe(true)
    expect(validateUsername('my-name')).toBe(true)
    expect(validateUsername('ABC123')).toBe(true)
  })
  test('rejects usernames with spaces', () => {
    expect(validateUsername('user name')).toBe(false)
    expect(validateUsername(' admin')).toBe(false)
  })
  test('rejects usernames with special chars', () => {
    expect(validateUsername('user@name')).toBe(false)
    expect(validateUsername('user.name')).toBe(false)
    expect(validateUsername('user!')).toBe(false)
  })
  test('rejects empty/null/undefined', () => {
    expect(validateUsername('')).toBe(false)
    expect(validateUsername(null)).toBe(false)
    expect(validateUsername(undefined)).toBe(false)
  })
})

describe('validateCategory', () => {
  test('valid data passes', () => {
    const result = validateCategory({ name: 'Electronics', active: true })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual({})
  })
  test('missing name fails', () => {
    const result = validateCategory({ name: '', active: true })
    expect(result.valid).toBe(false)
    expect(result.errors.name).toBe('El nombre es obligatorio')
  })
  test('whitespace-only name fails', () => {
    const result = validateCategory({ name: '   ', active: true })
    expect(result.valid).toBe(false)
    expect(result.errors.name).toBe('El nombre es obligatorio')
  })
  test('missing active fails', () => {
    const result = validateCategory({ name: 'Test' })
    expect(result.valid).toBe(false)
    expect(result.errors.active).toBe('El campo activo es obligatorio')
  })
  test('active=false is valid', () => {
    const result = validateCategory({ name: 'Test', active: false })
    expect(result.valid).toBe(true)
  })
})

describe('validateProduct', () => {
  test('valid minimal data passes', () => {
    const result = validateProduct({ title: 'Fridge', category: 'cat123' })
    expect(result.valid).toBe(true)
  })
  test('missing title fails', () => {
    const result = validateProduct({ title: '', category: 'cat123' })
    expect(result.valid).toBe(false)
    expect(result.errors.title).toBe('El título es obligatorio')
  })
  test('missing category fails', () => {
    const result = validateProduct({ title: 'Fridge', category: '' })
    expect(result.valid).toBe(false)
    expect(result.errors.category).toBe('La categoría es obligatoria')
  })
  test('invalid price fails', () => {
    const result = validateProduct({ title: 'Fridge', category: 'cat123', price: -5 })
    expect(result.valid).toBe(false)
    expect(result.errors.price).toBe('El precio debe ser un número positivo o dejarse vacío')
  })
  test('empty price is allowed', () => {
    const result = validateProduct({ title: 'Fridge', category: 'cat123', price: '' })
    expect(result.valid).toBe(true)
  })
  test('invalid discount fails', () => {
    const result = validateProduct({ title: 'Fridge', category: 'cat123', discount: 150 })
    expect(result.valid).toBe(false)
    expect(result.errors.discount).toBe('El descuento debe ser un entero entre 0 y 100')
  })
  test('invalid quantity fails', () => {
    const result = validateProduct({ title: 'Fridge', category: 'cat123', quantity: -1 })
    expect(result.valid).toBe(false)
    expect(result.errors.quantity).toBe('La cantidad debe ser un entero no negativo')
  })
})

describe('validateUser', () => {
  test('valid create data passes', () => {
    const result = validateUser({ name: 'Alice', username: 'alice', role: 'admin', password: 'secret123' }, false)
    expect(result.valid).toBe(true)
  })
  test('missing password on create fails', () => {
    const result = validateUser({ name: 'Alice', username: 'alice', role: 'admin', password: '' }, false)
    expect(result.valid).toBe(false)
    expect(result.errors.password).toBe('La contraseña es obligatoria')
  })
  test('valid edit without password passes', () => {
    const result = validateUser({ name: 'Alice', username: 'alice', role: 'admin' }, true)
    expect(result.valid).toBe(true)
  })
  test('edit with short password fails', () => {
    const result = validateUser({ name: 'Alice', username: 'alice', role: 'admin', password: 'abc' }, true)
    expect(result.valid).toBe(false)
    expect(result.errors.password).toBe('La contraseña debe tener al menos 6 caracteres')
  })
  test('edit with valid password passes', () => {
    const result = validateUser({ name: 'Alice', username: 'alice', role: 'admin', password: 'newpass' }, true)
    expect(result.valid).toBe(true)
  })
  test('invalid username format fails', () => {
    const result = validateUser({ name: 'Alice', username: 'alice doe', role: 'admin', password: 'pass123' }, false)
    expect(result.valid).toBe(false)
    expect(result.errors.username).toBe('El username solo puede contener letras, números, guiones y guiones bajos')
  })
})

// ─── Property-based tests ─────────────────────────────────────────────────────

// Feature: admin-panel, Property 9: La validación rechaza nombres vacíos o solo espacios
// Validates: Requirements 4.5, 5.5
describe('Property 9: La validación rechaza nombres vacíos o solo espacios', () => {
  test('validateCategory rechaza strings de solo espacios', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^ *$/), // empty or whitespace-only
        (whitespaceStr) => {
          const result = validateCategory({ name: whitespaceStr, active: true })
          return result.valid === false && result.errors.name === 'El nombre es obligatorio'
        }
      ),
      { numRuns: 100 }
    )
  })
})

// Feature: admin-panel, Property 20: Validación de campos numéricos del producto
// Validates: Requirements 7.3, 7.4, 7.5
describe('Property 20: Validación de campos numéricos del producto', () => {
  test('price negativo o no numérico es rechazado', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.double({ max: -0.001, noNaN: true }), // negative numbers
          fc.string().filter(s => s !== '' && isNaN(Number(s))) // non-numeric non-empty strings
        ),
        (badPrice) => {
          const result = validateProduct({ title: 'T', category: 'C', price: badPrice })
          return result.valid === false && 'price' in result.errors
        }
      ),
      { numRuns: 100 }
    )
  })

  test('discount fuera de [0,100] es rechazado', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ max: -1 }),   // below 0
          fc.integer({ min: 101 })   // above 100
        ),
        (badDiscount) => {
          const result = validateProduct({ title: 'T', category: 'C', discount: badDiscount })
          return result.valid === false && 'discount' in result.errors
        }
      ),
      { numRuns: 100 }
    )
  })

  test('quantity negativo es rechazado', () => {
    fc.assert(
      fc.property(
        fc.integer({ max: -1 }),
        (badQty) => {
          const result = validateProduct({ title: 'T', category: 'C', quantity: badQty })
          return result.valid === false && 'quantity' in result.errors
        }
      ),
      { numRuns: 100 }
    )
  })

  test('quantity no entero es rechazado', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.001), max: Math.fround(1000), noNaN: true }).filter(n => !Number.isInteger(n)),
        (floatQty) => {
          const result = validateProduct({ title: 'T', category: 'C', quantity: floatQty })
          return result.valid === false && 'quantity' in result.errors
        }
      ),
      { numRuns: 100 }
    )
  })
})

// Feature: admin-panel, Property 21: Validación de formato de username
// Validates: Requirement 7.6
describe('Property 21: Validación de formato de username', () => {
  test('strings con espacios son rechazados por validateUsername', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => /\s/.test(s)),
        (strWithSpace) => {
          return validateUsername(strWithSpace) === false
        }
      ),
      { numRuns: 100 }
    )
  })

  test('strings con caracteres fuera de [a-zA-Z0-9_-] son rechazados', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => /[^a-zA-Z0-9_-]/.test(s)),
        (badStr) => {
          return validateUsername(badStr) === false
        }
      ),
      { numRuns: 100 }
    )
  })

  test('strings válidos [a-zA-Z0-9_-] son aceptados', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z0-9_-]+$/),
        (validStr) => {
          return validateUsername(validStr) === true
        }
      ),
      { numRuns: 100 }
    )
  })
})
