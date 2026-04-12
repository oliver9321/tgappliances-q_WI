import { fetchCategories, createCategory, updateCategory } from '../api.js'
import { getState, setCategories, upsertCategory } from '../state.js'
import { validateCategory } from '../validators.js'
import { showSuccess, showError } from '../notifications.js'
import { openModal, closeModal, getModalBody } from '../modal.js'

let containerEl = null

// ── Helpers ──────────────────────────────────────────────────

function h(str) {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function applyErrors(form, errors) {
  form.querySelectorAll('.field-error').forEach(el => el.remove())
  form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'))
  Object.entries(errors).forEach(([field, msg]) => {
    const input = form.querySelector(`[name="${field}"]`)
    if (!input) return
    input.classList.add('input-error')
    const span = document.createElement('span')
    span.className = 'field-error'
    span.textContent = msg
    input.insertAdjacentElement('afterend', span)
  })
}

// ── Init ─────────────────────────────────────────────────────

export async function init(el) {
  containerEl = el
  containerEl.innerHTML = '<p class="loading-msg"><i class="fas fa-spinner fa-spin"></i> Cargando categorías...</p>'

  try {
    const list = await fetchCategories()
    setCategories(list)
  } catch (err) {
    showError(err.message || 'Error al cargar las categorías')
  }

  // Always render the table, even if fetch failed (shows empty state)
  renderList()
}

// ── List ─────────────────────────────────────────────────────

export function renderList() {
  if (!containerEl) return
  const list = getState().categories

  const rows = list.map(cat => {
    const badge = cat.active
      ? '<span class="badge badge-active">Activo</span>'
      : '<span class="badge badge-inactive">Inactivo</span>'
    const date = cat.dateCreation
      ? new Date(cat.dateCreation).toLocaleDateString('es-MX') : '—'
    return `<tr>
      <td>${h(cat.name)}</td>
      <td>${h(cat.description || '—')}</td>
      <td>${badge}</td>
      <td>${date}</td>
      <td class="td-actions">
        <button class="btn-icon btn-edit" data-id="${h(cat._id)}" title="Editar">
          <i class="fas fa-pencil-alt"></i>
        </button>
      </td>
    </tr>`
  }).join('')

  containerEl.innerHTML = `
    <div class="section-header">
      <h2><i class="fas fa-tags"></i> Categorías</h2>
      <button class="btn btn-primary" id="btn-new-cat">
        <i class="fas fa-plus"></i> Nueva Categoría
      </button>
    </div>
    <div class="admin-table-wrapper">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Descripción</th>
            <th>Estado</th>
            <th>Fecha creación</th>
            <th style="width:60px">Editar</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="5" class="table-empty">Sin categorías registradas</td></tr>'}
        </tbody>
      </table>
    </div>`

  containerEl.querySelector('#btn-new-cat').addEventListener('click', () => openForm())

  containerEl.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = getState().categories.find(c => c._id === btn.dataset.id)
      if (item) openForm(item)
    })
  })
}

// ── Form modal ────────────────────────────────────────────────

export function openForm(item) {
  const isEdit = Boolean(item)
  const activeVal = isEdit ? (item.active ? 'true' : 'false') : 'true'

  const metaFields = isEdit ? `
    <div class="form-row">
      <div class="form-group">
        <label>Fecha de creación</label>
        <input type="text" value="${h(item.dateCreation || '—')}" disabled>
      </div>
      <div class="form-group">
        <label>Creado por</label>
        <input type="text" value="${h(item.createdBy || '—')}" disabled>
      </div>
    </div>` : ''

  openModal(isEdit ? 'Editar Categoría' : 'Nueva Categoría', `
    <form id="cat-form" novalidate>
      <div class="form-group">
        <label for="cat-name">Nombre <span class="required">*</span></label>
        <input type="text" id="cat-name" name="name"
          value="${isEdit ? h(item.name) : ''}"
          placeholder="Nombre de la categoría" autofocus>
      </div>
      <div class="form-group">
        <label for="cat-desc">Descripción</label>
        <textarea id="cat-desc" name="description"
          placeholder="Descripción opcional">${isEdit ? h(item.description || '') : ''}</textarea>
      </div>
      <div class="form-group">
        <label for="cat-active">Estado <span class="required">*</span></label>
        <select id="cat-active" name="active">
          <option value="true"  ${activeVal === 'true'  ? 'selected' : ''}>Activo</option>
          <option value="false" ${activeVal === 'false' ? 'selected' : ''}>Inactivo</option>
        </select>
      </div>
      ${metaFields}
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">
          <i class="fas fa-save"></i> ${isEdit ? 'Actualizar' : 'Crear'}
        </button>
        <button type="button" class="btn btn-secondary" id="btn-cancel">
          <i class="fas fa-times"></i> Cancelar
        </button>
      </div>
    </form>`)

  getModalBody().querySelector('#btn-cancel').addEventListener('click', closeModal)
  getModalBody().querySelector('#cat-form').addEventListener('submit', e => handleSubmit(e, item))
}

// ── Submit ────────────────────────────────────────────────────

async function handleSubmit(e, item) {
  e.preventDefault()
  const form = e.target
  const fd = new FormData(form)
  const data = {
    name:        fd.get('name'),
    description: fd.get('description') || '',
    active:      fd.get('active') === 'true',
  }

  const { valid, errors } = validateCategory(data)
  if (!valid) { applyErrors(form, errors); return }
  applyErrors(form, {})

  const btn = form.querySelector('[type="submit"]')
  btn.disabled = true
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...'

  try {
    const result = item
      ? await updateCategory(item._id, data)
      : await createCategory(data)
    upsertCategory(result)
    closeModal()
    renderList()
    showSuccess(item ? 'Categoría actualizada correctamente' : 'Categoría creada correctamente')
  } catch (err) {
    showError(err.message || 'Error al guardar la categoría')
    btn.disabled = false
    btn.innerHTML = `<i class="fas fa-save"></i> ${item ? 'Actualizar' : 'Crear'}`
  }
}
