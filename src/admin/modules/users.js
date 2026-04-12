import { fetchUsers, createUser, updateUser } from '../api.js'
import { getState, setUsers, upsertUser } from '../state.js'
import { validateUser } from '../validators.js'
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
  containerEl.innerHTML = '<p class="loading-msg"><i class="fas fa-spinner fa-spin"></i> Cargando usuarios...</p>'

  try {
    const list = await fetchUsers()
    setUsers(list)
  } catch (err) {
    showError(err.message || 'Error al cargar los usuarios')
  }

  renderList()
}

// ── List ─────────────────────────────────────────────────────

export function renderList() {
  if (!containerEl) return
  const list = getState().users

  const rows = list.map(user => {
    const badge = user.active
      ? '<span class="badge badge-active">Activo</span>'
      : '<span class="badge badge-inactive">Inactivo</span>'
    let dateStr = '—'
    if (user.dateCreation) {
      const raw = typeof user.dateCreation === 'object' && user.dateCreation.$date
        ? user.dateCreation.$date : user.dateCreation
      dateStr = new Date(raw).toLocaleDateString('es-MX')
    }
    return `<tr>
      <td>${h(user.name)}</td>
      <td>${h(user.username)}</td>
      <td><span class="role-badge role-${h(user.role)}">${h(user.role)}</span></td>
      <td>${badge}</td>
      <td>${dateStr}</td>
      <td class="td-actions">
        <button class="btn-icon btn-edit" data-id="${h(user._id)}" title="Editar">
          <i class="fas fa-pencil-alt"></i>
        </button>
      </td>
    </tr>`
  }).join('')

  containerEl.innerHTML = `
    <div class="section-header">
      <h2><i class="fas fa-users"></i> Usuarios</h2>
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
            <th>Fecha creación</th>
            <th style="width:60px">Editar</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="6" class="table-empty">Sin usuarios registrados</td></tr>'}
        </tbody>
      </table>
    </div>`

  containerEl.querySelector('#btn-new-user').addEventListener('click', () => openForm())

  containerEl.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = getState().users.find(u => u._id === btn.dataset.id)
      if (item) openForm(item)
    })
  })
}

// ── Form modal ────────────────────────────────────────────────

export function openForm(item) {
  const isEdit    = Boolean(item)
  const activeVal = isEdit ? (item.active ? 'true' : 'false') : 'true'

  let dateDisplay = '—'
  if (isEdit && item.dateCreation) {
    const raw = typeof item.dateCreation === 'object' && item.dateCreation.$date
      ? item.dateCreation.$date : item.dateCreation
    dateDisplay = raw
  }

  const metaFields = isEdit ? `
    <div class="form-row">
      <div class="form-group">
        <label>Fecha de creación</label>
        <input type="text" value="${h(dateDisplay)}" disabled>
      </div>
      <div class="form-group">
        <label>Creado por</label>
        <input type="text" value="${h(item.createdBy || '—')}" disabled>
      </div>
    </div>` : ''

  openModal(isEdit ? 'Editar Usuario' : 'Nuevo Usuario', `
    <form id="user-form" novalidate>
      <div class="form-group">
        <label for="u-name">Nombre <span class="required">*</span></label>
        <input type="text" id="u-name" name="name"
          value="${isEdit ? h(item.name) : ''}"
          placeholder="Nombre completo" autofocus>
      </div>
      <div class="form-group">
        <label for="u-username">Username <span class="required">*</span></label>
        <input type="text" id="u-username" name="username"
          value="${isEdit ? h(item.username) : ''}"
          placeholder="Solo letras, números, - y _">
      </div>
      <div class="form-group">
        <label for="u-role">Rol <span class="required">*</span></label>
        <select id="u-role" name="role">
          <option value="">— Selecciona un rol —</option>
          <option value="admin"  ${isEdit && item.role === 'admin'  ? 'selected' : ''}>Admin</option>
          <option value="editor" ${isEdit && item.role === 'editor' ? 'selected' : ''}>Editor</option>
        </select>
      </div>
      <div class="form-group">
        <label for="u-pass">
          Contraseña
          ${isEdit
            ? '<span class="label-hint"> — dejar vacío para no cambiar</span>'
            : '<span class="required">*</span>'}
        </label>
        <input type="password" id="u-pass" name="password" value=""
          placeholder="${isEdit ? 'Dejar vacío para mantener' : 'Mínimo 6 caracteres'}"
          autocomplete="new-password">
      </div>
      <div class="form-group">
        <label for="u-active">Estado <span class="required">*</span></label>
        <select id="u-active" name="active">
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
  getModalBody().querySelector('#user-form').addEventListener('submit', e => handleSubmit(e, item))
}

// ── Submit ────────────────────────────────────────────────────

async function handleSubmit(e, item) {
  e.preventDefault()
  const isEdit = Boolean(item)
  const form   = e.target
  const fd     = new FormData(form)
  const pass   = fd.get('password') || ''

  const data = {
    name:     fd.get('name'),
    username: fd.get('username'),
    role:     fd.get('role'),
    active:   fd.get('active') === 'true',
  }
  if (pass.trim()) data.password = pass

  const { valid, errors } = validateUser(data, isEdit)
  if (!valid) { applyErrors(form, errors); return }
  applyErrors(form, {})

  const btn = form.querySelector('[type="submit"]')
  btn.disabled = true
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...'

  try {
    const result = isEdit
      ? await updateUser(item._id, data)
      : await createUser(data)
    upsertUser(result)
    closeModal()
    renderList()
    showSuccess(isEdit ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente')
  } catch (err) {
    const msg = err.message || ''
    if (msg.includes('409') || msg.toLowerCase().includes('username ya está en uso')) {
      showError('El username ya está en uso. Elige otro.')
    } else {
      showError(msg || 'Error al guardar el usuario')
    }
    btn.disabled = false
    btn.innerHTML = `<i class="fas fa-save"></i> ${isEdit ? 'Actualizar' : 'Crear'}`
  }
}
