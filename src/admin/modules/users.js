/**
 * users.js — Users submódulo del Admin Panel
 * Gestiona el listado y formulario CRUD de usuarios.
 * El campo `password` NUNCA se muestra en la lista ni se pre-carga en el formulario.
 */

import { fetchUsers, createUser, updateUser } from '../api.js'
import { getState, setUsers, upsertUser } from '../state.js'
import { validateUser } from '../validators.js'
import { showSuccess, showError } from '../notifications.js'

/** Referencia al contenedor del submódulo, asignada en init() */
let containerEl = null

// ============================================================
// Helpers
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

/**
 * Limpia errores previos y aplica los nuevos al formulario.
 * @param {HTMLFormElement} form
 * @param {Record<string, string>} errors
 */
function applyErrors(form, errors) {
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
// 20.1 — init(containerEl)
// ============================================================

/**
 * Inicializa el submódulo de usuarios.
 * Carga datos desde la API, los guarda en state y renderiza la lista.
 * @param {HTMLElement} el — contenedor del submódulo
 */
export async function init(el) {
  containerEl = el

  try {
    const list = await fetchUsers()
    setUsers(list)
  } catch (err) {
    showError(err.message || 'Error al cargar los usuarios')
  }

  renderList()
}

// ============================================================
// 20.2 — renderList()
// ============================================================

/**
 * Genera la tabla HTML de usuarios y la inyecta en containerEl.
 * Lee desde getState().users. NUNCA muestra el campo password.
 */
export function renderList() {
  if (!containerEl) return

  const users = getState().users

  const rows = users.map(user => {
    const badgeClass = user.active ? 'badge badge-active' : 'badge badge-inactive'
    const badgeText = user.active ? 'Activo' : 'Inactivo'

    // dateCreation puede ser un objeto { $date: "..." } o un string ISO
    let dateStr = '—'
    if (user.dateCreation) {
      const raw = typeof user.dateCreation === 'object' && user.dateCreation.$date
        ? user.dateCreation.$date
        : user.dateCreation
      dateStr = new Date(raw).toLocaleDateString('es-MX')
    }

    return `
      <tr>
        <td>${escapeHtml(user.name)}</td>
        <td>${escapeHtml(user.username)}</td>
        <td>${escapeHtml(user.role)}</td>
        <td><span class="${badgeClass}">${badgeText}</span></td>
        <td>${dateStr}</td>
        <td>
          <button class="btn btn-sm btn-secondary btn-edit-user" data-id="${user._id}">
            <i class="fas fa-pencil-alt"></i> Editar
          </button>
        </td>
      </tr>`
  }).join('')

  containerEl.innerHTML = `
    <div class="section-header">
      <h2>Usuarios</h2>
      <button class="btn btn-primary" id="btn-new-user">
        <i class="fas fa-plus"></i> Nuevo Usuario
      </button>
    </div>
    <div class="admin-table-wrapper">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Username</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Fecha de creación</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length ? rows : '<tr><td colspan="6" style="text-align:center;color:var(--text-light);padding:24px">Sin usuarios registrados</td></tr>'}
        </tbody>
      </table>
    </div>`

  containerEl.querySelector('#btn-new-user').addEventListener('click', () => openForm())

  containerEl.querySelectorAll('.btn-edit-user').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id
      const item = getState().users.find(u => u._id === id)
      if (item) openForm(item)
    })
  })
}

// ============================================================
// 20.3 — openForm(item?)
// ============================================================

/**
 * Renderiza el formulario de usuario (crear o editar).
 * En modo edición: pre-carga name, username, role, active; password SIEMPRE vacío.
 * dateCreation y createdBy se muestran como campos disabled en modo edición.
 * @param {object} [item] — usuario existente para editar; omitir para crear
 */
export function openForm(item) {
  if (!containerEl) return

  const isEdit = Boolean(item)
  const title = isEdit ? 'Editar Usuario' : 'Nuevo Usuario'

  const activeSelected = isEdit ? (item.active ? 'true' : 'false') : 'true'

  // Resolve dateCreation display value
  let dateCreationDisplay = '—'
  if (isEdit && item.dateCreation) {
    const raw = typeof item.dateCreation === 'object' && item.dateCreation.$date
      ? item.dateCreation.$date
      : item.dateCreation
    dateCreationDisplay = raw
  }

  // Read-only fields shown only in edit mode (Req 6.13)
  const readonlyFields = isEdit ? `
    <div class="form-group">
      <label>Fecha de creación</label>
      <input type="text" value="${escapeHtml(dateCreationDisplay)}" disabled>
    </div>
    <div class="form-group">
      <label>Creado por</label>
      <input type="text" value="${escapeHtml(item.createdBy || '—')}" disabled>
    </div>` : ''

  containerEl.innerHTML = `
    <div class="section-header">
      <h2>${title}</h2>
    </div>
    <form class="admin-form" id="user-form" novalidate>
      <h3>${title}</h3>

      <div class="form-group">
        <label for="user-name">Nombre <span style="color:var(--danger-color)">*</span></label>
        <input
          type="text"
          id="user-name"
          name="name"
          value="${isEdit ? escapeHtml(item.name) : ''}"
          placeholder="Nombre completo"
          required
        >
      </div>

      <div class="form-group">
        <label for="user-username">Username <span style="color:var(--danger-color)">*</span></label>
        <input
          type="text"
          id="user-username"
          name="username"
          value="${isEdit ? escapeHtml(item.username) : ''}"
          placeholder="Solo letras, números, guiones y guiones bajos"
          required
        >
      </div>

      <div class="form-group">
        <label for="user-role">Rol <span style="color:var(--danger-color)">*</span></label>
        <select id="user-role" name="role" required>
          <option value="">— Selecciona un rol —</option>
          <option value="admin"  ${isEdit && item.role === 'admin'  ? 'selected' : ''}>Admin</option>
          <option value="editor" ${isEdit && item.role === 'editor' ? 'selected' : ''}>Editor</option>
        </select>
      </div>

      <div class="form-group">
        <label for="user-password">
          Contraseña${isEdit ? ' <span style="color:var(--text-light);font-weight:normal">(dejar vacío para no cambiar)</span>' : ' <span style="color:var(--danger-color)">*</span>'}
        </label>
        <input
          type="password"
          id="user-password"
          name="password"
          value=""
          placeholder="${isEdit ? 'Dejar vacío para mantener la contraseña actual' : 'Mínimo 6 caracteres'}"
          ${isEdit ? '' : 'required'}
          autocomplete="new-password"
        >
      </div>

      <div class="form-group">
        <label for="user-active">Estado <span style="color:var(--danger-color)">*</span></label>
        <select id="user-active" name="active">
          <option value="true"  ${activeSelected === 'true'  ? 'selected' : ''}>Activo</option>
          <option value="false" ${activeSelected === 'false' ? 'selected' : ''}>Inactivo</option>
        </select>
      </div>

      ${readonlyFields}

      <div class="form-actions">
        <button type="submit" class="btn btn-primary">
          <i class="fas fa-save"></i> Guardar
        </button>
        <button type="button" class="btn btn-secondary" id="btn-cancel-user">
          <i class="fas fa-times"></i> Cancelar
        </button>
      </div>
    </form>`

  containerEl.querySelector('#btn-cancel-user').addEventListener('click', () => closeForm())

  const form = containerEl.querySelector('#user-form')
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
// 20.4 — handleSubmit (form submit)
// ============================================================

/**
 * Maneja el envío del formulario de usuario.
 * Valida, llama a la API, actualiza state y re-renderiza.
 * Maneja el error 409 (username duplicado) con mensaje específico.
 * @param {SubmitEvent} e
 * @param {object|undefined} item — usuario existente (edición) o undefined (creación)
 */
async function handleSubmit(e, item) {
  e.preventDefault()

  const isEdit = Boolean(item)
  const form = e.target
  const formData = new FormData(form)

  const passwordRaw = formData.get('password') || ''

  const data = {
    name: formData.get('name'),
    username: formData.get('username'),
    role: formData.get('role'),
    active: formData.get('active') === 'true',
  }

  // Only include password if provided (Req 6.7: omit to preserve existing hash)
  if (passwordRaw.trim() !== '') {
    data.password = passwordRaw
  }

  // Validación client-side (Req 7.1)
  const { valid, errors } = validateUser(data, isEdit)
  if (!valid) {
    applyErrors(form, errors)
    return
  }

  applyErrors(form, {})

  const submitBtn = form.querySelector('[type="submit"]')
  submitBtn.disabled = true

  try {
    let result
    if (isEdit) {
      result = await updateUser(item._id, data)
    } else {
      result = await createUser(data)
    }

    upsertUser(result)
    renderList()
    showSuccess(isEdit ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente')
  } catch (err) {
    const msg = err.message || ''
    // Req 6.6 / 8.4: specific message for duplicate username (409)
    if (msg.includes('409') || msg.toLowerCase().includes('username ya está en uso')) {
      showError('El username ya está en uso. Por favor elige otro.')
    } else {
      showError(msg || 'Error al guardar el usuario')
    }
    submitBtn.disabled = false
  }
}
