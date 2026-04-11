import { guardAdmin, getSession, clearSession } from './src/admin/auth.js'
import { login } from './src/admin/api.js'
import { initRouter, navigateTo } from './src/admin/router.js'
import { showError } from './src/admin/notifications.js'
import { init as initCategories } from './src/admin/modules/categories.js'
import { init as initProducts } from './src/admin/modules/products.js'
import { init as initUsers } from './src/admin/modules/users.js'

function showPanel(session) {
  document.getElementById('admin-panel').hidden = false
  document.getElementById('login-section').hidden = true
  document.getElementById('nav-username').textContent = session.username
  initRouter()
  navigateTo('categories')
  initCategories(document.getElementById('categories-section'))
  initProducts(document.getElementById('products-section'))
  initUsers(document.getElementById('users-section'))
}

// On page load
guardAdmin()

const session = getSession()
if (session) {
  showPanel(session)
} else {
  document.getElementById('login-section').hidden = false
  document.getElementById('admin-panel').hidden = true
}

// Login form
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const form = e.target
  const username = form.querySelector('[name="username"]').value
  const password = form.querySelector('[name="password"]').value
  const errorEl = document.getElementById('login-error')

  try {
    const data = await login(username, password)
    errorEl.hidden = true
    showPanel(data)
  } catch (err) {
    errorEl.textContent = err.message || 'Error al iniciar sesión'
    errorEl.hidden = false
  }
})

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
  clearSession()
})

// Sidebar toggle (mobile)
document.getElementById('sidebar-toggle').addEventListener('click', () => {
  document.body.classList.toggle('sidebar-open')
})
