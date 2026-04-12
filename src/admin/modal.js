/**
 * modal.js — Shared modal for the Admin Panel
 * Uses a single stable handler reference to avoid listener stacking.
 */

const overlay  = () => document.getElementById('modal-overlay')
const titleEl  = () => document.getElementById('modal-title')
const bodyEl   = () => document.getElementById('modal-body')
const closeBtn = () => document.getElementById('modal-close')

// Stable handler references so addEventListener/removeEventListener match
function onOverlayClick(e) {
  if (e.target === overlay()) closeModal()
}

function onCloseClick() {
  closeModal()
}

export function openModal(title, contentHtml) {
  titleEl().textContent = title
  bodyEl().innerHTML    = contentHtml

  // Remove any previous listeners before adding new ones (prevents stacking)
  overlay().removeEventListener('click', onOverlayClick)
  closeBtn().removeEventListener('click', onCloseClick)

  overlay().addEventListener('click', onOverlayClick)
  closeBtn().addEventListener('click', onCloseClick)

  overlay().hidden = false
  document.body.style.overflow = 'hidden'
}

export function closeModal() {
  overlay().hidden = true
  document.body.style.overflow = ''
  overlay().removeEventListener('click', onOverlayClick)
  closeBtn().removeEventListener('click', onCloseClick)
}

export function getModalBody() {
  return bodyEl()
}
