/**
 * router.js — Client-side navigation for the Admin Panel
 * Sections: categories | products | users
 */

const VALID_SECTIONS = ['categories', 'products', 'users']
let activeSection = null

export function navigateTo(section) {
  if (!VALID_SECTIONS.includes(section)) return

  // Hide all sections
  document.querySelectorAll('.admin-section').forEach(el => {
    el.hidden = true
  })

  // Show target section
  const target = document.getElementById(`${section}-section`)
  if (target) target.hidden = false

  // Update nav active state
  document.querySelectorAll('.nav-item[data-section]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === section)
  })

  activeSection = section
}

export function initRouter() {
  document.querySelectorAll('.nav-item[data-section]').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.section))
  })
}

export function getActiveSection() {
  return activeSection
}
