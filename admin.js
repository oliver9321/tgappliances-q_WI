import { guardAdmin, getSession, clearSession } from './src/admin/auth.js'
import { login } from './src/admin/api.js'
import { showError } from './src/admin/notifications.js'

// Module registry — loaded lazily on first nav click
const moduleLoaders = {
  categories: () => import('./src/admin/modules/categories.js'),
  products:   () => import('./src/admin/modules/products.js'),
  users:      () => import('./src/admin/modules/users.js'),
}
const loadedModules = {}

const VALID_SECTIONS = ['categories', 'products', 'users']
let panelReady = false

// ── Navigation ────────────────────────────────────────────────

async function navigateTo(section) {
  if (!VALID_SECTIONS.includes(section)) return

  // Show target section, hide others
  VALID_SECTIONS.forEach(s => {
    const el = document.getElementById(`${s}-section`)
    if (el) el.hidden = s !== section
  })

  // Update active nav item
  document.querySelectorAll('.nav-item[data-section]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === section)
  })

  // Close sidebar on mobile
  document.body.classList.remove('sidebar-open')

  // Get the container for this section
  const containerEl = document.getElementById(`${section}-section`)
  if (!containerEl) return

  // Show a loading indicator while the module loads
  if (!loadedModules[section]) {
    containerEl.innerHTML = '<p style="padding:24px;color:var(--text-light)">Cargando...</p>'
  }

  try {
    if (!loadedModules[section]) {
      const mod = await moduleLoaders[section]()
      loadedModules[section] = mod
    }
    await loadedModules[section].init(containerEl)
  } catch (err) {
    console.error(`Error loading module ${section}:`, err)
    containerEl.innerHTML = `<p style="padding:24px;color:var(--danger-color)">
      <i class="fas fa-exclamation-circle"></i> Error al cargar el módulo: ${err.message}
    </p>`
  }
}

// ── Panel ─────────────────────────────────────────────────────

function showPanel(session) {
  // Swap login ↔ panel
  document.getElementById('login-section').hidden = true
  document.getElementById('admin-panel').hidden = false
  document.getElementById('nav-username').textContent = session.username

  // Wire nav clicks only once
  if (!panelReady) {
    document.querySelectorAll('.nav-item[data-section]').forEach(btn => {
      btn.addEventListener('click', () => navigateTo(btn.dataset.section))
    })
    panelReady = true
  }

  // Default section
  navigateTo('categories')
}

// ── Boot ──────────────────────────────────────────────────────

guardAdmin()

const session = getSession()
if (session) {
  showPanel(session)
} else {
  document.getElementById('login-section').hidden = false
  document.getElementById('admin-panel').hidden = true
}

// ── Login form ────────────────────────────────────────────────

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const form = e.target
  const username  = form.querySelector('[name="username"]').value.trim()
  const password  = form.querySelector('[name="password"]').value
  const errorEl   = document.getElementById('login-error')
  const submitBtn = form.querySelector('[type="submit"]')

  submitBtn.disabled = true
  errorEl.hidden = true

  try {
    const data = await login(username, password)
    showPanel(data)
  } catch (err) {
    errorEl.textContent = err.message || 'Credenciales inválidas'
    errorEl.hidden = false
  } finally {
    submitBtn.disabled = false
  }
})

// ── Logout ────────────────────────────────────────────────────

document.getElementById('logout-btn').addEventListener('click', () => {
  clearSession()
})

// ── Sidebar toggle (mobile) ───────────────────────────────────

document.getElementById('sidebar-toggle').addEventListener('click', () => {
  document.body.classList.toggle('sidebar-open')
})
