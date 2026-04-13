import { getSession, setSession, clearSession } from './auth.js'

const API_URL = import.meta.env.VITE_API_URL

/**
 * Internal fetch wrapper that adds Authorization header and handles errors.
 * @param {string} path - API path (e.g. '/categories')
 * @param {RequestInit} options - fetch options
 * @returns {Promise<any>} Parsed JSON response
 */
async function apiFetch(path, options = {}) {
  const session = getSession()
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.token}`,
      ...options.headers,
    },
  })

  if (res.status === 401) {
    clearSession()
    throw new Error('Sesión expirada. Redirigiendo al login...')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `Error ${res.status}`)
  }

  return res.json()
}

/**
 * Authenticates a user and stores the session.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{username: string, name: string, role: string, token: string}>}
 */
export async function login(username, password) {
  console.log("login 2");
  const res = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `Error ${res.status}`)
  }

  const data = await res.json()
  setSession(data)
  return data
}

// Categories

export function fetchCategories() {
  return apiFetch('/categories')
}

export function createCategory(data) {
  return apiFetch('/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateCategory(id, data) {
  return apiFetch(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

// Products

export function fetchProducts() {
  return apiFetch('/products')
}

export function createProduct(data) {
  return apiFetch('/products', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateProduct(id, data) {
  return apiFetch(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

// Users

export function fetchUsers() {
  return apiFetch('/users')
}

export function createUser(data) {
  return apiFetch('/users', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateUser(id, data) {
  return apiFetch(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}
