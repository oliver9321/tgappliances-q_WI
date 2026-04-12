/**
 * modal.js — Bootstrap 5 modal wrapper for the Admin Panel
 */
import { Modal } from 'bootstrap'

let _bsModal = null

function getBsModal() {
  if (!_bsModal) {
    _bsModal = new Modal(document.getElementById('adminModal'), { backdrop: true, keyboard: true })
  }
  return _bsModal
}

export function openModal(title, contentHtml) {
  document.getElementById('modal-title').textContent = title
  document.getElementById('modal-body').innerHTML = contentHtml
  getBsModal().show()
}

export function closeModal() {
  getBsModal().hide()
}

export function getModalBody() {
  return document.getElementById('modal-body')
}
