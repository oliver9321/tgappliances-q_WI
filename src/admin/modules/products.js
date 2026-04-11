/**
 * products.js — Products submódulo del Admin Panel
 * Gestiona el listado y formulario CRUD de productos.
 */

import { fetchCategories, fetchProducts, createProduct, updateProduct } from '../api.js'
import { getState, setCategories, setProducts, upsertProduct } from '../state.js'
import { validateProduct } from '../validators.js'
import { showSuccess, showError } from '../notifications.js'
import { uploadImage, uploadGallery } from '../imageService.js'

/** Referencia al contenedor del submódulo, asignada en init() */
let containerEl = null

/** URL de la imagen principal subida (se actualiza al cambiar el input image) */
let imageUrl = ''

/** URLs de la galería subidas (se actualiza al cambiar el input gallery) */
let galleryUrls = []

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

/**
 * Resuelve el nombre de una categoría a partir de su _id.
 * @param {string} categoryId
 * @returns {string}
 */
function resolveCategoryName(categoryId) {
  const cat = getState().categories.find(c => c._id === categoryId)
  return cat ? cat.name : '—'
}

// ============================================================
// 19.1 — init(containerEl)
// ============================================================

/**
 * Inicializa el submódulo de productos.
 * Carga categorías y productos en paralelo, guarda en state y renderiza la lista.
 * @param {HTMLElement} el — contenedor del submódulo
 */
export async function init(el) {
  containerEl = el

  try {
    const [cats, prods] = await Promise.all([fetchCategories(), fetchProducts()])
    setCategories(cats)
    setProducts(prods)
  } catch (err) {
    showError(err.message || 'Error al cargar los productos')
  }

  renderList()
}

// ============================================================
// 19.2 — renderList()
// ============================================================

/**
 * Genera la tabla HTML de productos y la inyecta en containerEl.
 * Resuelve el nombre de la categoría usando resolveCategoryName().
 */
export function renderList() {
  if (!containerEl) return

  const products = getState().products

  const rows = products.map(prod => {
    const categoryName = resolveCategoryName(prod.category)
    const badgeClass = prod.active ? 'badge badge-active' : 'badge badge-inactive'
    const badgeText = prod.active ? 'Activo' : 'Inactivo'
    const date = prod.dateCreation ? new Date(prod.dateCreation).toLocaleDateString('es-MX') : '—'
    const price = prod.price != null ? `$${Number(prod.price).toFixed(2)}` : '—'

    return `
      <tr>
        <td>${escapeHtml(prod.title)}</td>
        <td>${escapeHtml(categoryName)}</td>
        <td>${price}</td>
        <td><span class="${badgeClass}">${badgeText}</span></td>
        <td>${date}</td>
        <td>
          <button class="btn btn-sm btn-secondary btn-edit-prod" data-id="${prod._id}">
            <i class="fas fa-pencil-alt"></i> Editar
          </button>
        </td>
      </tr>`
  }).join('')

  containerEl.innerHTML = `
    <div class="section-header">
      <h2>Productos</h2>
      <button class="btn btn-primary" id="btn-new-product">
        <i class="fas fa-plus"></i> Nuevo Producto
      </button>
    </div>
    <div class="admin-table-wrapper">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Título</th>
            <th>Categoría</th>
            <th>Precio</th>
            <th>Estado</th>
            <th>Fecha de creación</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length ? rows : '<tr><td colspan="6" style="text-align:center;color:var(--text-light);padding:24px">Sin productos registrados</td></tr>'}
        </tbody>
      </table>
    </div>`

  containerEl.querySelector('#btn-new-product').addEventListener('click', () => openForm())

  containerEl.querySelectorAll('.btn-edit-prod').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id
      const item = getState().products.find(p => p._id === id)
      if (item) openForm(item)
    })
  })
}

// ============================================================
// 19.3 — openForm(item?)
// ============================================================

/**
 * Renderiza el formulario de producto (crear o editar).
 * @param {object} [item] — producto existente para editar; omitir para crear
 */
export function openForm(item) {
  if (!containerEl) return

  // Reset module-level image state
  imageUrl = item?.image || ''
  galleryUrls = item?.gallery ? [...item.gallery] : []

  const isEdit = Boolean(item)
  const title = isEdit ? 'Editar Producto' : 'Nuevo Producto'

  // Only active categories in the selector
  const activeCategories = getState().categories.filter(c => c.active)
  const categoryOptions = activeCategories.map(cat => {
    const selected = isEdit && item.category === cat._id ? 'selected' : ''
    return `<option value="${escapeHtml(cat._id)}" ${selected}>${escapeHtml(cat.name)}</option>`
  }).join('')

  const activeSelected = isEdit ? (item.active ? 'true' : 'false') : 'true'

  // Read-only fields shown only in edit mode
  const readonlyFields = isEdit ? `
    <div class="form-group">
      <label>Fecha de creación</label>
      <input type="text" value="${escapeHtml(item.dateCreation || '—')}" disabled>
    </div>
    <div class="form-group">
      <label>Creado por</label>
      <input type="text" value="${escapeHtml(item.createdBy || '—')}" disabled>
    </div>` : ''

  containerEl.innerHTML = `
    <div class="section-header">
      <h2>${title}</h2>
    </div>
    <form class="admin-form" id="product-form" novalidate>
      <h3>${title}</h3>

      <div class="form-group">
        <label for="prod-category">Categoría <span style="color:var(--danger-color)">*</span></label>
        <select id="prod-category" name="category" required>
          <option value="">— Selecciona una categoría —</option>
          ${categoryOptions}
        </select>
      </div>

      <div class="form-group">
        <label for="prod-title">Título <span style="color:var(--danger-color)">*</span></label>
        <input
          type="text"
          id="prod-title"
          name="title"
          value="${isEdit ? escapeHtml(item.title) : ''}"
          placeholder="Título del producto"
          required
        >
      </div>

      <div class="form-group">
        <label for="prod-description">Descripción</label>
        <textarea
          id="prod-description"
          name="description"
          placeholder="Descripción opcional"
        >${isEdit ? escapeHtml(item.description || '') : ''}</textarea>
      </div>

      <div class="form-group">
        <label for="prod-price">Precio</label>
        <input
          type="number"
          id="prod-price"
          name="price"
          value="${isEdit && item.price != null ? item.price : ''}"
          placeholder="Precio (opcional)"
          min="0"
          step="0.01"
        >
      </div>

      <div class="form-group">
        <label for="prod-discount">Descuento (%)</label>
        <input
          type="number"
          id="prod-discount"
          name="discount"
          value="${isEdit ? (item.discount ?? 0) : 0}"
          placeholder="0"
          min="0"
          max="100"
          step="1"
        >
      </div>

      <div class="form-group">
        <label for="prod-image">Imagen principal</label>
        <input type="file" id="prod-image" name="image" accept="image/*">
        ${isEdit && item.image ? `<p class="field-hint">Imagen actual: <a href="${escapeHtml(item.image)}" target="_blank" rel="noopener">ver imagen</a></p>` : ''}
      </div>

      <div class="form-group">
        <label for="prod-gallery">Galería (múltiples imágenes)</label>
        <input type="file" id="prod-gallery" name="gallery" accept="image/*" multiple>
        ${isEdit && item.gallery?.length ? `<p class="field-hint">${item.gallery.length} imagen(es) en galería actual</p>` : ''}
      </div>

      <div class="form-group">
        <label for="prod-quantity">Cantidad</label>
        <input
          type="number"
          id="prod-quantity"
          name="quantity"
          value="${isEdit ? (item.quantity ?? 0) : 0}"
          placeholder="0"
          min="0"
          step="1"
        >
      </div>

      <div class="form-group">
        <label for="prod-priority">Prioridad</label>
        <input
          type="number"
          id="prod-priority"
          name="priority"
          value="${isEdit ? (item.priority ?? 0) : 0}"
          placeholder="0"
          step="1"
        >
      </div>

      <div class="form-group">
        <label for="prod-dateEndPublish">Fecha fin de publicación</label>
        <input
          type="datetime-local"
          id="prod-dateEndPublish"
          name="dateEndPublish"
          value="${isEdit && item.dateEndPublish ? item.dateEndPublish.slice(0, 16) : ''}"
        >
      </div>

      <div class="form-group">
        <label for="prod-active">Estado <span style="color:var(--danger-color)">*</span></label>
        <select id="prod-active" name="active">
          <option value="true"  ${activeSelected === 'true'  ? 'selected' : ''}>Activo</option>
          <option value="false" ${activeSelected === 'false' ? 'selected' : ''}>Inactivo</option>
        </select>
      </div>

      ${readonlyFields}

      <div class="form-actions">
        <button type="submit" class="btn btn-primary">
          <i class="fas fa-save"></i> Guardar
        </button>
        <button type="button" class="btn btn-secondary" id="btn-cancel-prod">
          <i class="fas fa-times"></i> Cancelar
        </button>
      </div>
    </form>`

  containerEl.querySelector('#btn-cancel-prod').addEventListener('click', () => closeForm())

  // 19.4 — Image upload handlers
  const imageInput = containerEl.querySelector('#prod-image')
  imageInput.addEventListener('change', async () => {
    const file = imageInput.files[0]
    if (!file) return
    try {
      imageUrl = await uploadImage(file)
    } catch (err) {
      showError(err.message || 'Error al subir la imagen')
      imageUrl = isEdit ? (item?.image || '') : ''
    }
  })

  const galleryInput = containerEl.querySelector('#prod-gallery')
  galleryInput.addEventListener('change', async () => {
    const files = Array.from(galleryInput.files)
    if (!files.length) return
    try {
      galleryUrls = await uploadGallery(files)
    } catch (err) {
      showError(err.message || 'Error al subir la galería')
      galleryUrls = isEdit ? (item?.gallery ? [...item.gallery] : []) : []
    }
  })

  // 19.5 — Form submit
  const form = containerEl.querySelector('#product-form')
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
// 19.5 — handleSubmit (form submit)
// ============================================================

/**
 * Maneja el envío del formulario de producto.
 * Valida, llama a la API, actualiza state y re-renderiza.
 * @param {SubmitEvent} e
 * @param {object|undefined} item — producto existente (edición) o undefined (creación)
 */
async function handleSubmit(e, item) {
  e.preventDefault()

  const form = e.target
  const formData = new FormData(form)

  const priceRaw = formData.get('price')
  const discountRaw = formData.get('discount')
  const quantityRaw = formData.get('quantity')
  const priorityRaw = formData.get('priority')
  const dateEndPublishRaw = formData.get('dateEndPublish')

  const data = {
    category: formData.get('category'),
    title: formData.get('title'),
    description: formData.get('description') || '',
    price: priceRaw !== '' && priceRaw != null ? Number(priceRaw) : null,
    discount: discountRaw !== '' && discountRaw != null ? Number(discountRaw) : 0,
    image: imageUrl || '',
    gallery: galleryUrls,
    quantity: quantityRaw !== '' && quantityRaw != null ? Number(quantityRaw) : 0,
    priority: priorityRaw !== '' && priorityRaw != null ? Number(priorityRaw) : 0,
    dateEndPublish: dateEndPublishRaw || null,
    active: formData.get('active') === 'true',
  }

  // Validación client-side (Req 7.1)
  const { valid, errors } = validateProduct(data)
  if (!valid) {
    applyErrors(form, errors)
    return
  }

  applyErrors(form, {})

  const submitBtn = form.querySelector('[type="submit"]')
  submitBtn.disabled = true

  try {
    let result
    if (item) {
      result = await updateProduct(item._id, data)
    } else {
      result = await createProduct(data)
    }

    upsertProduct(result)
    renderList()
    showSuccess(item ? 'Producto actualizado correctamente' : 'Producto creado correctamente')
  } catch (err) {
    showError(err.message || 'Error al guardar el producto')
    submitBtn.disabled = false
  }
}
