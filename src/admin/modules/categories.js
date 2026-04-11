/**
 * categories.js — Categories submódulo del Admin Panel
 * Gestiona el listado y formulario CRUD de categorías.
 */

import { fetchCategories, createCategory, updateCategory } from '../api.js'
import { getState, setCategories, upsertCategory } from '../state.js'
import { validateCategory } from '../validators.js'
import { showSuccess, showError } from '../notifications.js'

/** Referencia al contenedor del submódulo, asignada en init() */
let containerEl = null

// ============================================================
// Helper: aplica errores de validación inline al formulario
// ============================================================

/**
 * Limpia errores previos y aplica los nuevos al formulario.
 * @param {HTMLFormElement} form
 * @param {Record<string, string>} errors
 */
function applyErrors(form, errors) {
  // Limpiar errores previos
  form.querySelectorAll('.field-error').forEach(el => el.remove())
  form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'))

  Object.entries(errors).forEach(([field, message]) => {
    const input = form.querySelector(`[name="${field}"]`)
    if (!input) return
    input.classList.add('input-error')
    const errorEl = document.createElement('span')
    errorEl.className = 'field-error'
    errorEl.textContent = message
    input.insertAdjacentElement('afterend', errorEl)
  })
}

// ============================================================
// 17.1 — init(containerEl)
// ============================================================

/**
 * Inicializa el submódulo de categorías.
 * Carga datos desde la API, los guarda en state y renderiza la lista.
 * @param {HTMLElement} el — contenedor del submódulo
 */
export async function init(el) {
  containerEl = el

  try {
    const list = await fetchCategories()
    setCategories(list)
  } catch (err) {
    showError(err.message || 'Error al cargar las categorías')
  }

  renderList()
}

// ============================================================
// 17.2 — renderList()
// ============================================================

/**
 * Genera la tabla HTML de categorías y la inyecta en containerEl.
 * Lee desde getState().categories.
 */
export function renderList() {
  if (!containerEl) return

  const categories = getState().categories

  const rows = categories.map(cat => {
    const badgeClass = cat.active ? 'badge badge-active' : 'badge badge-inactive'
    const badgeText = cat.active ? 'Activo' : 'Inactivo'
    const date = cat.dateCreation ? new Date(cat.dateCreation).toLocaleDateString('es-MX') : '—'

    return `
      <tr>
        <td>${escapeHtml(cat.name)}</td>
        <td><span class="${badgeClass}">${badgeText}</span></td>
        <td>${date}</td>
        <td>
          <button class="btn btn-sm btn-secondary btn-edit-cat" data-id="${cat._id}">
            <i class="fas fa-pencil-alt"></i> Editar
          </button>
        </td>
      </tr>`
  }).join('')

  containerEl.innerHTML = `
    <div class="section-header">
      <h2>Categorías</h2>
      <button class="btn btn-primary" id="btn-new-category">
        <i class="fas fa-plus"></i> Nueva Categoría
      </button>
    </div>
    <div class="admin-table-wrapper">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Estado</th>
            <th>Fecha de creación</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length ? rows : '<tr><td colspan="4" style="text-align:center;color:var(--text-light);padding:24px">Sin categorías registradas</td></tr>'}
        </tbody>
      </table>
    </div>`

  // Botón "Nueva Categoría"
  containerEl.querySelector('#btn-new-category').addEventListener('click', () => openForm())

  // Botones "Editar" por fila
  containerEl.querySelectorAll('.btn-edit-cat').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id
      const item = getState().categories.find(c => c._id === id)
      if (item) openForm(item)
    })
  })
}

// ============================================================
// 17.3 — openForm(item?)
// ============================================================

/**
 * Renderiza el formulario de categoría (crear o editar).
 * @param {object} [item] — categoría existente para editar; omitir para crear
 */
export function openForm(item) {
  if (!containerEl) return

  const isEdit = Boolean(item)
  const title = isEdit ? 'Editar Categoría' : 'Nueva Categoría'

  // Campos de solo lectura (solo en modo edición)
  const readonlyFields = isEdit ? `
    <div class="form-group">
      <label>Fecha de creación</label>
      <input type="text" value="${escapeHtml(item.dateCreation || '—')}" disabled>
    </div>
    <div class="form-group">
      <label>Creado por</label>
      <input type="text" value="${escapeHtml(item.createdBy || '—')}" disabled>
    </div>` : ''

  // Valor del selector active
  const activeSelected = isEdit ? (item.active ? 'true' : 'false') : 'true'

  containerEl.innerHTML = `
    <div class="section-header">
      <h2>${title}</h2>
    </div>
    <form class="admin-form" id="category-form" novalidate>
      <h3>${title}</h3>

      <div class="form-group">
        <label for="cat-name">Nombre <span style="color:var(--danger-color)">*</span></label>
        <input
          type="text"
          id="cat-name"
          name="name"
          value="${isEdit ? escapeHtml(item.name) : ''}"
          placeholder="Nombre de la categoría"
          required
        >
      </div>

      <div class="form-group">
        <label for="cat-description">Descripción</label>
        <textarea
          id="cat-description"
          name="description"
          placeholder="Descripción opcional"
        >${isEdit ? escapeHtml(item.description || '') : ''}</textarea>
      </div>

      <div class="form-group">
        <label for="cat-active">Estado <span style="color:var(--danger-color)">*</span></label>
        <select id="cat-active" name="active">
          <option value="true"  ${activeSelected === 'true'  ? 'selected' : ''}>Activo</option>
          <option value="false" ${activeSelected === 'false' ? 'selected' : ''}>Inactivo</option>
        </select>
      </div>

      ${readonlyFields}

      <div class="form-actions">
        <button type="submit" class="btn btn-primary">
          <i class="fas fa-save"></i> Guardar
        </button>
        <button type="button" class="btn btn-secondary" id="btn-cancel-cat">
          <i class="fas fa-times"></i> Cancelar
        </button>
      </div>
    </form>`

  // Cancelar → volver a la lista
  containerEl.querySelector('#btn-cancel-cat').addEventListener('click', () => closeForm())

  // Submit
  const form = containerEl.querySelector('#category-form')
  form.addEventListener('submit', (e) => handleSubmit(e, item))
}

// ============================================================
// closeForm
// ============================================================

/**
 * Cierra el formulario y vuelve a la lista.
 */
export function closeForm() {
  renderList()
}

// ============================================================
// 17.4 — handleSubmit (form submit)
// ============================================================

/**
 * Maneja el envío del formulario de categoría.
 * Valida, llama a la API, actualiza state y re-renderiza.
 * @param {SubmitEvent} e
 * @param {object|undefined} item — categoría existente (edición) o undefined (creación)
 */
async function handleSubmit(e, item) {
  e.preventDefault()

  const form = e.target
  const formData = new FormData(form)

  const data = {
    name: formData.get('name'),
    description: formData.get('description') || '',
    active: formData.get('active') === 'true',
  }

  // Validación client-side (Req 7.1)
  const { valid, errors } = validateCategory(data)
  if (!valid) {
    applyErrors(form, errors)
    return
  }

  // Limpiar errores previos si la validación pasa
  applyErrors(form, {})

  // Deshabilitar botón de submit mientras se procesa
  const submitBtn = form.querySelector('[type="submit"]')
  submitBtn.disabled = true

  try {
    let result
    if (item) {
      result = await updateCategory(item._id, data)
    } else {
      result = await createCategory(data)
    }

    upsertCategory(result)
    renderList()
    showSuccess(item ? 'Categoría actualizada correctamente' : 'Categoría creada correctamente')
  } catch (err) {
    showError(err.message || 'Error al guardar la categoría')
    submitBtn.disabled = false
  }
}

// ============================================================
// Utility
// ============================================================

/**
 * Escapa caracteres HTML para evitar XSS al inyectar en innerHTML.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
