import { fetchCategories, fetchProducts, createProduct, updateProduct } from '../api.js'
import { getState, setCategories, setProducts, upsertProduct } from '../state.js'
import { validateProduct } from '../validators.js'
import { showSuccess, showError } from '../notifications.js'
import { uploadImage, uploadGallery } from '../imageService.js'
import { openModal, closeModal, getModalBody } from '../modal.js'
import { Jodit } from 'jodit'
import 'jodit/es2021/jodit.min.css'

let containerEl = null
let imageUrl = ''
let galleryUrls = []
let joditEditor = null  // Jodit instance

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
      <i class="fas fa-spinner fa-spin"></i> Cargando productos...
    </div>`

  try {
    const [cats, prods] = await Promise.all([fetchCategories(), fetchProducts()])
    setCategories(cats)
    setProducts(prods)
  } catch (err) {
    showError(err.message || 'Error al cargar los productos')
  }

  renderList()
}

export function renderList() {
  if (!containerEl) return
  const list = getState().products

  const rows = list.map(prod => {
    const badge = prod.active
      ? '<span class="badge bg-success">Activo</span>'
      : '<span class="badge bg-danger">Inactivo</span>'
    const date  = prod.dateCreation ? new Date(prod.dateCreation).toLocaleDateString('es-MX') : '—'
    const price = prod.price != null ? `$${Number(prod.price).toFixed(2)}` : '—'
    const thumb = prod.image
      ? `<img src="${h(prod.image)}" alt="" class="table-thumb">`
      : '<span class="no-image"><i class="fas fa-image"></i></span>'

    return `<tr>
      <td>${thumb}</td>
      <td>${h(prod.title)}</td>
      <td>${h(prod.category)}</td>
      <td>${price}</td>
      <td>${badge}</td>
      <td>${date}</td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-primary btn-edit" data-id="${h(prod._id)}" title="Editar">
          <i class="fas fa-pencil-alt"></i>
        </button>
      </td>
    </tr>`
  }).join('')

  containerEl.innerHTML = `
    <div class="section-header">
      <h2 class="h5 fw-bold mb-0"><i class="fas fa-box me-2"></i>Productos</h2>
      <button class="btn btn-danger btn-sm" id="btn-new-prod">
        <i class="fas fa-plus me-1"></i> Nuevo Producto
      </button>
    </div>
    <div class="card shadow-sm">
      <div class="table-responsive">
        <table class="table table-hover table-bordered align-middle mb-0">
          <thead class="table-dark">
            <tr>
              <th style="width:56px">Img</th>
              <th>Título</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Estado</th>
              <th>Fecha creación</th>
              <th style="width:70px">Editar</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="7" class="text-center text-muted py-4">Sin productos registrados</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`

  containerEl.querySelector('#btn-new-prod').addEventListener('click', () => openForm())
  containerEl.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = getState().products.find(p => p._id === btn.dataset.id)
      if (item) openForm(item)
    })
  })
}

export function openForm(item) {
  imageUrl    = item?.image   || ''
  galleryUrls = item?.gallery ? [...item.gallery] : []

  const isEdit    = Boolean(item)
  const activeVal = isEdit ? (item.active ? 'true' : 'false') : 'true'
  const activeCats = getState().categories.filter(c => c.active)
  const catOptions = activeCats.map(cat => {
    const sel = isEdit && item.category === cat.name ? 'selected' : ''
    return `<option value="${h(cat.name)}" ${sel}>${h(cat.name)}</option>`
  }).join('')

  const metaFields = isEdit ? `
    <div class="row g-3 mt-1">
      <div class="col-sm-6">
        <label class="form-label fw-semibold">Fecha de creación</label>
        <input type="text" class="form-control" value="${h(item.dateCreation || '—')}" disabled>
      </div>
      <div class="col-sm-6">
        <label class="form-label fw-semibold">Creado por</label>
        <input type="text" class="form-control" value="${h(item.createdBy || '—')}" disabled>
      </div>
    </div>` : ''

  openModal(isEdit ? 'Editar Producto' : 'Nuevo Producto', `
    <form id="prod-form" novalidate>
      <div class="mb-3">
        <label for="p-cat" class="form-label fw-semibold">Categoría <span class="text-danger">*</span></label>
        <select id="p-cat" name="category" class="form-select" required>
          <option value="">— Selecciona una categoría —</option>
          ${catOptions}
        </select>
      </div>
      <div class="mb-3">
        <label for="p-title" class="form-label fw-semibold">Título <span class="text-danger">*</span></label>
        <input type="text" id="p-title" name="title" class="form-control"
          value="${isEdit ? h(item.title) : ''}" placeholder="Título del producto" autofocus>
      </div>
      <div class="mb-3">
        <label for="p-desc" class="form-label fw-semibold">Descripción</label>
        <textarea id="p-desc" name="description"
          placeholder="Descripción opcional">${isEdit ? (item.description || '') : ''}</textarea>
      </div>
      <div class="row g-3 mb-3">
        <div class="col-sm-6">
          <label for="p-price" class="form-label fw-semibold">Precio ($)</label>
          <input type="number" id="p-price" name="price" class="form-control"
            value="${isEdit && item.price != null ? item.price : ''}" placeholder="Opcional" min="0" step="0.01">
        </div>
        <div class="col-sm-6">
          <label for="p-discount" class="form-label fw-semibold">Descuento (%)</label>
          <input type="number" id="p-discount" name="discount" class="form-control"
            value="${isEdit ? (item.discount ?? 0) : 0}" min="0" max="100" step="1">
        </div>
      </div>
      <div class="row g-3 mb-3">
        <div class="col-sm-6">
          <label for="p-qty" class="form-label fw-semibold">Cantidad</label>
          <input type="number" id="p-qty" name="quantity" class="form-control"
            value="${isEdit ? (item.quantity ?? 0) : 0}" min="0" step="1">
        </div>
        <div class="col-sm-6">
          <label for="p-priority" class="form-label fw-semibold">Prioridad</label>
          <input type="number" id="p-priority" name="priority" class="form-control"
            value="${isEdit ? (item.priority ?? 0) : 0}" step="1">
        </div>
      </div>
      <div class="mb-3">
        <label for="p-image" class="form-label fw-semibold">Imagen principal</label>
        <input type="file" id="p-image" name="image" class="form-control" accept="image/*">
        ${isEdit && item.image ? `<div class="field-hint mt-1"><a href="${h(item.image)}" target="_blank" rel="noopener">Ver imagen actual</a></div>` : ''}
        <div id="img-status" class="field-hint"></div>
      </div>
      <div class="mb-3">
        <label for="p-gallery" class="form-label fw-semibold">Galería (múltiples)</label>
        <input type="file" id="p-gallery" name="gallery" class="form-control" accept="image/*" multiple>
        ${isEdit && item.gallery?.length ? `<div class="field-hint mt-1">${item.gallery.length} imagen(es) en galería actual</div>` : ''}
        <div id="gal-status" class="field-hint"></div>
      </div>
      <div class="mb-3">
        <label for="p-end" class="form-label fw-semibold">Fecha fin publicación</label>
        <input type="datetime-local" id="p-end" name="dateEndPublish" class="form-control"
          value="${isEdit && item.dateEndPublish ? item.dateEndPublish.slice(0, 16) : ''}">
      </div>
      <div class="mb-3">
        <label for="p-active" class="form-label fw-semibold">Estado <span class="text-danger">*</span></label>
        <select id="p-active" name="active" class="form-select">
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

  const body = getModalBody()
  body.querySelector('#btn-cancel').addEventListener('click', closeModal)

  // Destroy any previous Jodit instance before creating a new one
  if (joditEditor) {
    joditEditor.destruct()
    joditEditor = null
  }

  // Initialize Jodit on the description textarea
  joditEditor = Jodit.make('#p-desc', {
    height: 250,
    language: 'es',
    toolbarButtonSize: 'small',
    buttons: [
      'bold', 'italic', 'underline', 'strikethrough', '|',
      'ul', 'ol', '|',
      'outdent', 'indent', '|',
      'font', 'fontsize', 'brush', '|',
      'align', '|',
      'undo', 'redo', '|',
      'hr', 'eraser', 'copyformat', '|',
      'fullsize'
    ],
    placeholder: 'Descripción opcional',
    askBeforePasteHTML: false,
    askBeforePasteFromWord: false,
    defaultActionOnPaste: 'insert_clear_html',
  })

  // Destroy Jodit when modal closes
  const modalEl = document.getElementById('adminModal')
  const onModalHide = () => {
    if (joditEditor) {
      joditEditor.destruct()
      joditEditor = null
    }
    modalEl.removeEventListener('hidden.bs.modal', onModalHide)
  }
  modalEl.addEventListener('hidden.bs.modal', onModalHide)

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

async function handleSubmit(e, item) {
  e.preventDefault()
  const form = e.target
  const fd   = new FormData(form)

  // Get description from Jodit editor if available, fallback to textarea
  const description = joditEditor ? joditEditor.value : (fd.get('description') || '')

  const data = {
    category:       fd.get('category'),
    title:          fd.get('title'),
    description,
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
  btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Guardando...'

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
    btn.innerHTML = `<i class="fas fa-save me-1"></i> ${item ? 'Actualizar' : 'Crear'}`
  }
}
