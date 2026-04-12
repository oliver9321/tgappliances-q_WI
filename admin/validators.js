/**
 * Helper: returns true if value is empty/null/undefined (allowed as null)
 * OR is a positive decimal number; false if negative or non-numeric non-empty.
 */
export function validatePrice(value) {
  if (value === null || value === undefined || value === '') return true
  const num = Number(value)
  return !isNaN(num) && num > 0
}

/**
 * Helper: returns true if value is an integer in [0, 100].
 */
export function validateDiscount(value) {
  if (value === null || value === undefined || value === '') return false
  const num = Number(value)
  return Number.isInteger(num) && num >= 0 && num <= 100
}

/**
 * Helper: returns true if value is a non-negative integer (0 or more).
 */
export function validateQuantity(value) {
  if (value === null || value === undefined || value === '') return false
  const num = Number(value)
  return Number.isInteger(num) && num >= 0
}

/**
 * Helper: returns true if value matches only [a-zA-Z0-9_-] (no spaces, no special chars).
 */
export function validateUsername(value) {
  if (!value) return false
  return /^[a-zA-Z0-9_-]+$/.test(value)
}

/**
 * Validates category form data.
 * @param {{ name?: any, active?: any }} data
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateCategory(data) {
  const errors = {}

  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    errors.name = 'El nombre es obligatorio'
  }

  if (data.active === undefined) {
    errors.active = 'El campo activo es obligatorio'
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

/**
 * Validates product form data.
 * @param {{ title?: any, category?: any, price?: any, discount?: any, quantity?: any }} data
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateProduct(data) {
  const errors = {}

  if (!data.title || String(data.title).trim() === '') {
    errors.title = 'El título es obligatorio'
  }

  if (!data.category || String(data.category).trim() === '') {
    errors.category = 'La categoría es obligatoria'
  }

  if (data.price !== undefined && data.price !== null && data.price !== '') {
    if (!validatePrice(data.price)) {
      errors.price = 'El precio debe ser un número positivo o dejarse vacío'
    }
  }

  if (data.discount !== undefined && data.discount !== null && data.discount !== '') {
    if (!validateDiscount(data.discount)) {
      errors.discount = 'El descuento debe ser un entero entre 0 y 100'
    }
  }

  if (data.quantity !== undefined && data.quantity !== null && data.quantity !== '') {
    if (!validateQuantity(data.quantity)) {
      errors.quantity = 'La cantidad debe ser un entero no negativo'
    }
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

/**
 * Validates user form data.
 * @param {{ name?: any, username?: any, role?: any, password?: any }} data
 * @param {boolean} isEdit - true when editing an existing user
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateUser(data, isEdit) {
  const errors = {}

  if (!data.name || String(data.name).trim() === '') {
    errors.name = 'El nombre es obligatorio'
  }

  if (!data.username || String(data.username).trim() === '') {
    errors.username = 'El username es obligatorio'
  } else if (!validateUsername(data.username)) {
    errors.username = 'El username solo puede contener letras, números, guiones y guiones bajos'
  }

  if (!data.role || String(data.role).trim() === '') {
    errors.role = 'El rol es obligatorio'
  }

  if (!isEdit) {
    if (!data.password || String(data.password).trim() === '') {
      errors.password = 'La contraseña es obligatoria'
    }
  } else {
    if (data.password && String(data.password).length > 0 && String(data.password).length < 6) {
      errors.password = 'La contraseña debe tener al menos 6 caracteres'
    }
  }

  return { valid: Object.keys(errors).length === 0, errors }
}
