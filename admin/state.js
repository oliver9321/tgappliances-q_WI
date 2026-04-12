// Global in-memory state for the admin panel
const state = {
  categories: [],
  products: [],
  users: [],
}

export function getState() {
  return state
}

export function setCategories(list) {
  state.categories = Array.isArray(list) ? list : []
}

export function upsertCategory(item) {
  const idx = state.categories.findIndex(c => c._id === item._id)
  if (idx !== -1) {
    state.categories[idx] = item
  } else {
    state.categories.unshift(item)
  }
}

export function setProducts(list) {
  state.products = Array.isArray(list) ? list : []
}

export function upsertProduct(item) {
  const idx = state.products.findIndex(p => p._id === item._id)
  if (idx !== -1) {
    state.products[idx] = item
  } else {
    state.products.unshift(item)
  }
}

export function setUsers(list) {
  state.users = Array.isArray(list) ? list : []
}

export function upsertUser(item) {
  const idx = state.users.findIndex(u => u._id === item._id)
  if (idx !== -1) {
    state.users[idx] = item
  } else {
    state.users.unshift(item)
  }
}
