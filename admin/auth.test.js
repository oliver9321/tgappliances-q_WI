import { describe, test, beforeEach, vi } from 'vitest'
import fc from 'fast-check'

// Mock sessionStorage and window.location before importing the module
const sessionStorageMock = (() => {
  let store = {}
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = value }),
    removeItem: vi.fn((key) => { delete store[key] }),
    clear: () => { store = {} },
    _store: () => store,
  }
})()

Object.defineProperty(global, 'sessionStorage', { value: sessionStorageMock })
Object.defineProperty(global, 'window', {
  value: { location: { href: '' } },
  writable: true,
})

import { isAdmin } from './auth.js'

// Feature: admin-panel, Property 1: Auth_Guard acepta solo sesiones admin válidas
// Validates: Requirements 1.1, 1.2
describe('Property 1: Auth_Guard acepta solo sesiones admin válidas', () => {
  beforeEach(() => {
    sessionStorageMock.clear()
    vi.clearAllMocks()
  })

  test('isAdmin retorna true solo cuando role === "admin"', () => {
    fc.assert(
      fc.property(
        fc.record({
          username: fc.string(),
          name: fc.string(),
          role: fc.string(),
        }),
        (session) => {
          const result = isAdmin(session)
          return result === (session.role === 'admin')
        }
      ),
      { numRuns: 100 }
    )
  })

  test('isAdmin retorna false para null, undefined y primitivos', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.integer(),
          fc.boolean(),
          fc.string(),
        ),
        (value) => {
          return isAdmin(value) === false
        }
      ),
      { numRuns: 100 }
    )
  })

  test('isAdmin retorna false para objetos con role distinto de "admin"', () => {
    fc.assert(
      fc.property(
        fc.record({
          username: fc.string(),
          name: fc.string(),
          role: fc.string().filter((r) => r !== 'admin'),
        }),
        (session) => {
          return isAdmin(session) === false
        }
      ),
      { numRuns: 100 }
    )
  })
})
