import { fetchCategories, createCategory, updateCategory } from '../api.js'
import { getState, setCategories, upsertCategory } from '../state.js'
import { validateCategory } from '../validators.js'
import { showSuccess, showError } from '../notifications.js'
import { openModal, closeModal, getModalBody } from '../modal.js'

let containerEl = null

function h(str) {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function applyErrors(form, errors) {
  form.querySelectorAll('.field-error').forEach(el => el.remove())
  form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'))
  Object.entries(errors).forEach(([field, msg]) => {
    const input = form.querySelector(`[name="${field}"]`)
    if (!input) return
    input.classList.add('is-invalid')
    const span = document.createElement('span')
    span.className = 'field-error invalid-feedback d-block'
    span.textContent = msg
    input.insertAdjacentElement('afterend', span)
  })
}

export async function init(el) {
  containerEl = el
  containerEl.innerHTML = `
    <div class="d-flex align-items-center gap-2 text-muted p-4">
      <i class="fas fa-spinner fa-spin"></i> Cargando categorías...
    </div>`

  try {
    const list = await fetchCategories()
    setCategories(list)
  } catch (err) {
    showError(err.message || 'Error al cargar las categorías')
  }

  renderList()
}

export function renderList() {
  if (!containerEl) return
  const list = getState().categories

  const rows = list.map(cat => {
    const badge = cat.active
      ? '<span class="badge bg-success">Activo</span>'
      : '<span class="badge bg-danger">Inactivo</span>'
    const date = cat.dateCreation
      ? new Date(cat.dateCreation).toLocaleDateString('es-MX') : '—'
    return `<tr>
      <td>${h(cat.name)}</td>
      <td>${h(cat.description || '—')}</td>
      <td>${badge}</td>
      <td>${date}</td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-primary btn-edit" data-id="${h(cat._id)}" title="Editar">
          <i class="fas fa-pencil-alt"></i>
        </button>
      </td>
    </tr>`
  }).join('')

  containerEl.innerHTML = `
    <div class="section-header">
      <h2 class="h5 fw-bold mb-0"><i class="fas fa-tags me-2"></i>Categorías</h2>
      <button class="btn btn-danger btn-sm" id="btn-new-cat">
        <i class="fas fa-plus me-1"></i> Nueva Categoría
      </button>
    </div>
    <div class="card shadow-sm">
      <div class="table-responsive">
        <table class="table table-hover table-bordered align-middle mb-0">
          <thead class="table-dark">
            <tr>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Estado</th>
              <th>Fecha creación</th>
              <th style="width:70px">Editar</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="5" class="text-center text-muted py-4">Sin categorías registradas</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`

  containerEl.querySelector('#btn-new-cat').addEventListener('click', () => openForm())
  containerEl.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = getState().categories.find(c => c._id === btn.dataset.id)
      if (item) openForm(item)
    })
  })
}

export function openForm(item) {
  const isEdit = Boolean(item)
  const activeVal = isEdit ? (item.active ? 'true' : 'false') : 'true'

  const metaFields = isEdit ? `
    <div class="row g-3">
      <div class="col-sm-6">
        <label class="form-label fw-semibold">Fecha de creación</label>
        <input type="text" class="form-control" value="${h(item.dateCreation || '—')}" disabled>
      </div>
      <div class="col-sm-6">
        <label class="form-label fw-semibold">Creado por</label>
        <input type="text" class="form-control" value="${h(item.createdBy || '—')}" disabled>
      </div>
    </div>` : ''

  openModal(isEdit ? 'Editar Categoría' : 'Nueva Categoría', `
    <form id="cat-form" novalidate>
      <div class="mb-3">
        <label for="cat-name" class="form-label fw-semibold">Nombre <span class="text-danger">*</span></label>
        <input type="text" id="cat-name" name="name" class="form-control"
          value="${isEdit ? h(item.name) : ''}" placeholder="Nombre de la categoría" autofocus>
      </div>
      <div class="mb-3">
        <label for="cat-desc" class="form-label fw-semibold">Descripción</label>
        <textarea id="cat-desc" name="description" class="form-control" rows="3"
          placeholder="Descripción opcional">${isEdit ? h(item.description || '') : ''}</textarea>
      </div>
      <div class="mb-3">
        <label for="cat-active" class="form-label fw-semibold">Estado <span class="text-danger">*</span></label>
        <select id="cat-active" name="active" class="form-select">
          <option value="true"  ${activeVal === 'true'  ? 'selected' : ''}>Activo</option>
          <option value="false" ${activeVal === 'false' ? 'selected' : ''}>Inactivo</option>
        </select>
      </div>
      ${metaFields}
      <div class="d-flex gap-2 mt-4 pt-3 border-top">
        <button type="submit" class="btn btn-danger">
          <i class="fas fa-save me-1"></i> ${isEdit ? 'Actualizar' : 'Crear'}
        </button>
        <button type="button" class="btn btn-secondary" id="btn-cancel">
          <i class="fas fa-times me-1"></i> Cancelar
        </button>
      </div>
    </form>`)

  getModalBody().querySelector('#btn-cancel').addEventListener('click', closeModal)
  getModalBody().querySelector('#cat-form').addEventListener('submit', e => handleSubmit(e, item))
}

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
  btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Guardando...'

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
    btn.innerHTML = `<i class="fas fa-save me-1"></i> ${item ? 'Actualizar' : 'Crear'}`
  }
}
