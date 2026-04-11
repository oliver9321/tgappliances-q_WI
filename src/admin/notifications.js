/**
 * notifications.js — Toast notification system for the Admin Panel
 */

const TOAST_DURATION = 4000
const ANIMATION_DURATION = 300

function getContainer() {
  let container = document.getElementById('toast-container')
  if (!container) {
    container = document.createElement('div')
    container.id = 'toast-container'
    document.body.appendChild(container)
  }
  return container
}

function createToast(message, typeClass, iconClass) {
  const toast = document.createElement('div')
  toast.className = `toast ${typeClass}`
  toast.innerHTML = `<i class="${iconClass}"></i><span>${message}</span>`

  const container = getContainer()
  container.appendChild(toast)

  setTimeout(() => {
    toast.classList.add('toast-hide')
    setTimeout(() => toast.remove(), ANIMATION_DURATION)
  }, TOAST_DURATION)
}

export function showSuccess(message) {
  createToast(message, 'toast-success', 'fas fa-check-circle')
}

export function showError(message) {
  createToast(message, 'toast-error', 'fas fa-times-circle')
}

export function showInfo(message) {
  createToast(message, 'toast-info', 'fas fa-info-circle')
}
