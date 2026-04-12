import { fetchCategories, fetchProducts, createProduct, updateProduct } from '../api.js'
import { getState, setCategories, setProducts, upsertProduct } from '../state.js'
import { validateProduct } from '../validators.js'
import { showSuccess, showError } from '../notifications.js'
import { uploadImage, uploadGallery } from '../imageService.js'
import { openModal, closeModal, getModalBody } from '../modal.js'

let containerEl = null
let imageUrl = ''
let galleryUrls = []

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

function resolveCategoryName(id) {
  const cat = getState().categories.find(c => c._id === id)
  return cat ? cat.name : '—'
}

// ── Init ─────────────────────────────────────────────────────

export async function init(el) {
  containerEl = el
  containerEl.innerHTML = '<p class="loading-msg"><i class="fas fa-spinner fa-spin"></i> Cargando productos...</p>'

  try {
    const [cats, prods] = await Promise.all([fetchCategories(), fetchProducts()])
    setCategories(cats)
    setProducts(prods)
  } catch (err) {
    showError(err.message || 'Error al cargar los productos')
  }

  renderList()
}

// ── List ─────────────────────────────────────────────────────

export function renderList() {
  if (!containerEl) return
  const list = getState().products

  const rows = list.map(prod => {
    const catName = resolveCategoryName(prod.category)
    const badge = prod.active
      ? '<span class="badge badge-active">Activo</span>'
      : '<span class="badge badge-inactive">Inactivo</span>'
    const date  = prod.dateCreation ? new Date(prod.dateCreation).toLocaleDateString('es-MX') : '—'
    const price = prod.price != null ? `$${Number(prod.price).toFixed(2)}` : '—'
    const thumb = prod.image
      ? `<img src="${h(prod.image)}" alt="" class="table-thumb">`
      : '<span class="no-image"><i class="fas fa-image"></i></span>'

    return `<tr>
      <td>${thumb}</td>
      <td>${h(prod.title)}</td>
      <td>${h(catName)}</td>
      <td>${price}</td>
      <td>${badge}</td>
      <td>${date}</td>
      <td class="td-actions">
        <button class="btn-icon btn-edit" data-id="${h(prod._id)}" title="Editar">
          <i class="fas fa-pencil-alt"></i>
        </button>
      </td>
    </tr>`
  }).join('')

  containerEl.innerHTML = `
    <div class="section-header">
      <h2><i class="fas fa-box"></i> Productos</h2>
      <button class="btn btn-primary" id="btn-new-prod">
        <i class="fas fa-plus"></i> Nuevo Producto
      </button>
    </div>
    <div class="admin-table-wrapper">
      <table class="admin-table">
        <thead>
          <tr>
            <th style="width:56px">Img</th>
            <th>Título</th>
            <th>Categoría</th>
            <th>Precio</th>
            <th>Estado</th>
            <th>Fecha creación</th>
            <th style="width:60px">Editar</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="7" class="table-empty">Sin productos registrados</td></tr>'}
        </tbody>
      </table>
    </div>`

  containerEl.querySelector('#btn-new-prod').addEventListener('click', () => openForm())

  containerEl.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = getState().products.find(p => p._id === btn.dataset.id)
      if (item) openForm(item)
    })
  })
}

// ── Form modal ────────────────────────────────────────────────

export function openForm(item) {
  imageUrl    = item?.image   || ''
  galleryUrls = item?.gallery ? [...item.gallery] : []

  const isEdit    = Boolean(item)
  const activeVal = isEdit ? (item.active ? 'true' : 'false') : 'true'
  const activeCats = getState().categories.filter(c => c.active)
  const catOptions = activeCats.map(cat => {
    const sel = isEdit && item.category === cat._id ? 'selected' : ''
    return `<option value="${h(cat._id)}" ${sel}>${h(cat.name)}</option>`
  }).join('')

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

  openModal(isEdit ? 'Editar Producto' : 'Nuevo Producto', `
    <form id="prod-form" novalidate>
      <div class="form-group">
        <label for="p-cat">Categoría <span class="required">*</span></label>
        <select id="p-cat" name="category" required>
          <option value="">— Selecciona una categoría —</option>
          ${catOptions}
        </select>
      </div>
      <div class="form-group">
        <label for="p-title">Título <span class="required">*</span></label>
        <input type="text" id="p-title" name="title"
          value="${isEdit ? h(item.title) : ''}"
          placeholder="Título del producto" autofocus>
      </div>
      <div class="form-group">
        <label for="p-desc">Descripción</label>
        <textarea id="p-desc" name="description"
          placeholder="Descripción opcional">${isEdit ? h(item.description || '') : ''}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="p-price">Precio ($)</label>
          <input type="number" id="p-price" name="price"
            value="${isEdit && item.price != null ? item.price : ''}"
            placeholder="Opcional" min="0" step="0.01">
        </div>
        <div class="form-group">
          <label for="p-discount">Descuento (%)</label>
          <input type="number" id="p-discount" name="discount"
            value="${isEdit ? (item.discount ?? 0) : 0}"
            min="0" max="100" step="1">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="p-qty">Cantidad</label>
          <input type="number" id="p-qty" name="quantity"
            value="${isEdit ? (item.quantity ?? 0) : 0}" min="0" step="1">
        </div>
        <div class="form-group">
          <label for="p-priority">Prioridad</label>
          <input type="number" id="p-priority" name="priority"
            value="${isEdit ? (item.priority ?? 0) : 0}" step="1">
        </div>
      </div>
      <div class="form-group">
        <label for="p-image">Imagen principal</label>
        <input type="file" id="p-image" name="image" accept="image/*">
        ${isEdit && item.image ? `<p class="field-hint"><a href="${h(item.image)}" target="_blank" rel="noopener">Ver imagen actual</a></p>` : ''}
        <p id="img-status" class="field-hint"></p>
      </div>
      <div class="form-group">
        <label for="p-gallery">Galería (múltiples)</label>
        <input type="file" id="p-gallery" name="gallery" accept="image/*" multiple>
        ${isEdit && item.gallery?.length ? `<p class="field-hint">${item.gallery.length} imagen(es) en galería actual</p>` : ''}
        <p id="gal-status" class="field-hint"></p>
      </div>
      <div class="form-group">
        <label for="p-end">Fecha fin publicación</label>
        <input type="datetime-local" id="p-end" name="dateEndPublish"
          value="${isEdit && item.dateEndPublish ? item.dateEndPublish.slice(0, 16) : ''}">
      </div>
      <div class="form-group">
        <label for="p-active">Estado <span class="required">*</span></label>
        <select id="p-active" name="active">
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

  const body = getModalBody()
  body.querySelector('#btn-cancel').addEventListener('click', closeModal)

  body.querySelector('#p-image').addEventListener('change', async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const status = body.querySelector('#img-status')
    status.textContent = 'Subiendo...'
    try {
      imageUrl = await uploadImage(file)
      status.textContent = '✓ Imagen subida'
    } catch (err) {
      showError(err.message || 'Error al subir la imagen')
      status.textContent = '✗ Error'
      imageUrl = item?.image || ''
    }
  })

  body.querySelector('#p-gallery').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    const status = body.querySelector('#gal-status')
    status.textContent = `Subiendo ${files.length} imagen(es)...`
    try {
      galleryUrls = await uploadGallery(files)
      status.textContent = `✓ ${galleryUrls.length} imagen(es) subidas`
    } catch (err) {
      showError(err.message || 'Error al subir la galería')
      status.textContent = '✗ Error'
      galleryUrls = item?.gallery ? [...item.gallery] : []
    }
  })

  body.querySelector('#prod-form').addEventListener('submit', e => handleSubmit(e, item))
}

// ── Submit ────────────────────────────────────────────────────

async function handleSubmit(e, item) {
  e.preventDefault()
  const form = e.target
  const fd   = new FormData(form)

  const data = {
    category:       fd.get('category'),
    title:          fd.get('title'),
    description:    fd.get('description') || '',
    price:          fd.get('price') !== '' ? Number(fd.get('price')) : null,
    discount:       fd.get('discount') !== '' ? Number(fd.get('discount')) : 0,
    image:          imageUrl || '',
    gallery:        galleryUrls,
    quantity:       fd.get('quantity') !== '' ? Number(fd.get('quantity')) : 0,
    priority:       fd.get('priority') !== '' ? Number(fd.get('priority')) : 0,
    dateEndPublish: fd.get('dateEndPublish') || null,
    active:         fd.get('active') === 'true',
  }

  const { valid, errors } = validateProduct(data)
  if (!valid) { applyErrors(form, errors); return }
  applyErrors(form, {})

  const btn = form.querySelector('[type="submit"]')
  btn.disabled = true
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...'

  try {
    const result = item
      ? await updateProduct(item._id, data)
      : await createProduct(data)
    upsertProduct(result)
    closeModal()
    renderList()
    showSuccess(item ? 'Producto actualizado correctamente' : 'Producto creado correctamente')
  } catch (err) {
    showError(err.message || 'Error al guardar el producto')
    btn.disabled = false
    btn.innerHTML = `<i class="fas fa-save"></i> ${item ? 'Actualizar' : 'Crear'}`
  }
}
