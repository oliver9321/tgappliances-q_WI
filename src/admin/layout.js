/**
 * layout.js — Shared bootstrap for admin module pages.
 * Guards session, injects username, wires logout + sidebar toggle.
 */
import { getSession, isAdmin, clearSession } from './auth.js'

export function initLayout(activeSection) {
  const session = getSession()

  // Guard: no valid session → back to login
  if (!session || !isAdmin(session)) {
    window.location.href = '/admin.html'
    return null
  }

  // Inject username
  const usernameEl = document.getElementById('nav-username')
  if (usernameEl) usernameEl.textContent = session.username

  // Highlight active nav item
  document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === activeSection)
  })

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', () => clearSession())

  // Sidebar toggle (mobile)
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    document.body.classList.toggle('sidebar-open')
  })

  return session
}
