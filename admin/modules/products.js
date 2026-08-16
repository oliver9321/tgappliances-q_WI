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
let searchTerm = ''     // current product search query
let showInactive = false // hide inactive products from the grid by default
let currentPage = 1     // current pagination page (1-indexed)
const PAGE_SIZE = 10    // products per page

function h(str) {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;').replace(/'/g, '&#39;')
}

/**
 * Lowercases and strips accents so "Frigidaire" matches "frigidaire" and
 * "eléctrico" matches "electrico".
 */
function normalize(str) {
  return String(str ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/** Removes HTML tags so the rich-text description can be searched as plain text. */
function stripHtml(str) {
  return String(str ?? '').replace(/<[^>]*>/g, ' ')
}

/**
 * Returns true when a product matches the query. Every whitespace-separated
 * term must appear somewhere in the product, so "lg washer" narrows results
 * instead of widening them.
 */
export function matchesSearch(prod, term) {
  const terms = normalize(term).split(/\s+/).filter(Boolean)
  if (!terms.length) return true

  const haystack = normalize([
    prod.title,
    prod.category,
    stripHtml(prod.description),
    prod.price != null ? prod.price : '',
    prod.active ? 'active' : 'inactive',
  ].join(' '))

  return terms.every(t => haystack.includes(t))
}

/**
 * Applies the grid's visibility rules to a product list: inactive products are
 * hidden unless explicitly requested, then the search query narrows the result.
 *
 * @param {Array} products
 * @param {{ term?: string, includeInactive?: boolean }} [options]
 * @returns {Array}
 */
export function filterProducts(products, { term = '', includeInactive = false } = {}) {
  let list = Array.isArray(products) ? products : []

  if (!includeInactive) list = list.filter(p => p.active)
  if (term.trim()) list = list.filter(p => matchesSearch(p, term))

  return list
}

/**
 * Products currently visible. Inactive products stay reachable through the
 * toggle so they can still be edited or reactivated.
 */
function getFilteredProducts() {
  return filterProducts(getState().products, {
    term: searchTerm,
    includeInactive: showInactive,
  })
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
      <i class="fas fa-spinner fa-spin"></i> Loading products...
    </div>`

  try {
    const [cats, prods] = await Promise.all([fetchCategories(), fetchProducts()])
    setCategories(cats)
    setProducts(prods)
  } catch (err) {
    showError(err.message || 'Error loading products')
  }

  renderList()
}

export function renderList() {
  if (!containerEl) return
  const all = getState().products
  const inactiveCount = all.filter(p => !p.active).length
  const total = showInactive ? all.length : all.length - inactiveCount
  const filtered = getFilteredProducts()

  // --- Pagination math ---
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  if (currentPage > totalPages) currentPage = totalPages
  if (currentPage < 1) currentPage = 1
  const startIdx = (currentPage - 1) * PAGE_SIZE
  const pageItems = filtered.slice(startIdx, startIdx + PAGE_SIZE)

  const rows = pageItems.map(prod => {
    const badge = prod.active
      ? '<span class="badge bg-success">Active</span>'
      : '<span class="badge bg-danger">Inactive</span>'
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
        <button class="btn btn-sm btn-outline-primary btn-edit" data-id="${h(prod._id)}" title="Edit">
          <i class="fas fa-pencil-alt"></i>
        </button>
      </td>
    </tr>`
  }).join('')

  const isSearching = Boolean(searchTerm.trim())

  let emptyMessage
  if (isSearching) {
    emptyMessage = `No products match “${h(searchTerm)}”`
  } else if (!showInactive && inactiveCount > 0) {
    emptyMessage = 'No active products. Enable “Show inactive” to see the rest.'
  } else {
    emptyMessage = 'No products registered'
  }
  const emptyRow = `<tr><td colspan="7" class="text-center text-muted py-4">${emptyMessage}</td></tr>`

  // --- Pagination controls ---
  const paginationHtml = totalPages > 1 ? renderPagination(currentPage, totalPages, filtered.length) : ''

  containerEl.innerHTML = `
    <div class="section-header">
      <h2 class="h5 fw-bold mb-0"><i class="fas fa-box me-2"></i>Products</h2>
      <button class="btn btn-danger btn-sm" id="btn-new-prod">
        <i class="fas fa-plus me-1"></i> New Product
      </button>
    </div>
    <div class="card shadow-sm">
      <div class="card-body border-bottom py-3">
        <div class="row g-2 align-items-center">
          <div class="col-12 col-md-6 col-lg-5">
            <label for="prod-search" class="visually-hidden">Search products</label>
            <div class="input-group">
              <span class="input-group-text" aria-hidden="true">
                <i class="fas fa-search"></i>
              </span>
              <input
                type="search"
                id="prod-search"
                class="form-control"
                placeholder="Search by title, category, price..."
                value="${h(searchTerm)}"
                autocomplete="off">
              <button class="btn btn-outline-secondary" type="button" id="prod-search-clear"
                title="Clear search" aria-label="Clear search"
                ${isSearching ? '' : 'disabled'}>
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
          <div class="col-12 col-md-auto">
            <div class="form-check form-switch mb-0">
              <input class="form-check-input" type="checkbox" role="switch"
                id="prod-show-inactive" ${showInactive ? 'checked' : ''}>
              <label class="form-check-label small" for="prod-show-inactive">
                Show inactive${inactiveCount ? ` (${inactiveCount})` : ''}
              </label>
            </div>
          </div>
          <div class="col-12 col-md-auto ms-md-auto">
            <span class="text-muted small" id="prod-search-count" aria-live="polite">
              ${isSearching ? `${filtered.length} of ${total} product(s)` : `${total} product(s)`}
            </span>
          </div>
        </div>
      </div>
      <div class="table-responsive">
        <table class="table table-hover table-bordered align-middle mb-0">
          <thead class="table-dark">
            <tr>
              <th style="width:56px">Img</th>
              <th>Title</th>
              <th>Category</th>
              <th>Price</th>
              <th>Status</th>
              <th>Creation Date</th>
              <th style="width:70px">Edit</th>
            </tr>
          </thead>
          <tbody>
            ${rows || emptyRow}
          </tbody>
        </table>
      </div>
      ${paginationHtml}
    </div>`

  containerEl.querySelector('#btn-new-prod').addEventListener('click', () => openForm())
  containerEl.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = getState().products.find(p => p._id === btn.dataset.id)
      if (item) openForm(item)
    })
  })

  wireSearch()
  wirePagination()
}

/**
 * Builds the pagination bar HTML.
 */
function renderPagination(page, totalPages, totalItems) {
  const from = (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, totalItems)

  // Generate page buttons. For many pages, show a window around the current page.
  let pages = []
  const maxButtons = 7
  if (totalPages <= maxButtons) {
    pages = Array.from({ length: totalPages }, (_, i) => i + 1)
  } else {
    pages = [1]
    let start = Math.max(2, page - 1)
    let end = Math.min(totalPages - 1, page + 1)
    if (page <= 3) { start = 2; end = 5 }
    if (page >= totalPages - 2) { start = totalPages - 4; end = totalPages - 1 }
    if (start > 2) pages.push('...')
    for (let i = start; i <= end; i++) pages.push(i)
    if (end < totalPages - 1) pages.push('...')
    pages.push(totalPages)
  }

  const buttons = pages.map(p => {
    if (p === '...') return '<li class="page-item disabled"><span class="page-link">…</span></li>'
    const active = p === page ? 'active' : ''
    return `<li class="page-item ${active}">
      <button class="page-link" data-page="${p}" ${active ? 'aria-current="page"' : ''}>${p}</button>
    </li>`
  }).join('')

  return `
    <div class="card-footer d-flex flex-wrap align-items-center justify-content-between gap-2 py-2 px-3">
      <span class="text-muted small">Showing ${from}–${to} of ${totalItems}</span>
      <nav aria-label="Product list pagination">
        <ul class="pagination pagination-sm mb-0">
          <li class="page-item ${page <= 1 ? 'disabled' : ''}">
            <button class="page-link" data-page="${page - 1}" aria-label="Previous" ${page <= 1 ? 'tabindex="-1"' : ''}>
              <i class="fas fa-chevron-left"></i>
            </button>
          </li>
          ${buttons}
          <li class="page-item ${page >= totalPages ? 'disabled' : ''}">
            <button class="page-link" data-page="${page + 1}" aria-label="Next" ${page >= totalPages ? 'tabindex="-1"' : ''}>
              <i class="fas fa-chevron-right"></i>
            </button>
          </li>
        </ul>
      </nav>
    </div>`
}

/** Wires click events on pagination buttons. */
function wirePagination() {
  containerEl.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault()
      const p = Number(btn.dataset.page)
      if (!isNaN(p) && p !== currentPage) {
        currentPage = p
        renderList()
        // Scroll the table into view on page change.
        containerEl.querySelector('.table-responsive')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  })
}

/**
 * Wires the search input. Re-rendering the list replaces the input, so focus and
 * caret position are restored to keep typing uninterrupted.
 */
function wireSearch() {
  const input = containerEl.querySelector('#prod-search')
  const clearBtn = containerEl.querySelector('#prod-search-clear')
  const inactiveToggle = containerEl.querySelector('#prod-show-inactive')

  inactiveToggle?.addEventListener('change', e => {
    showInactive = e.target.checked
    currentPage = 1
    renderList()
  })

  if (!input) return

  input.addEventListener('input', e => {
    searchTerm = e.target.value
    currentPage = 1
    const caret = e.target.selectionStart
    renderList()
    const next = containerEl.querySelector('#prod-search')
    if (next) {
      next.focus()
      next.setSelectionRange(caret, caret)
    }
  })

  // Let Escape clear the field while it has focus.
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape' && searchTerm) {
      e.preventDefault()
      searchTerm = ''
      currentPage = 1
      renderList()
      containerEl.querySelector('#prod-search')?.focus()
    }
  })

  clearBtn?.addEventListener('click', () => {
    searchTerm = ''
    currentPage = 1
    renderList()
    containerEl.querySelector('#prod-search')?.focus()
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
        <label class="form-label fw-semibold">Creation Date</label>
        <input type="text" class="form-control" value="${h(item.dateCreation || '—')}" disabled>
      </div>
      <div class="col-sm-6">
        <label class="form-label fw-semibold">Created By</label>
        <input type="text" class="form-control" value="${h(item.createdBy || '—')}" disabled>
      </div>
    </div>` : ''

  openModal(isEdit ? 'Edit Product' : 'New Product', `
    <form id="prod-form" novalidate>
      <div class="mb-3">
        <label for="p-cat" class="form-label fw-semibold">Category <span class="text-danger">*</span></label>
        <select id="p-cat" name="category" class="form-select" required>
          <option value="">— Select a category —</option>
          ${catOptions}
        </select>
      </div>
      <div class="mb-3">
        <label for="p-title" class="form-label fw-semibold">Title <span class="text-danger">*</span></label>
        <input type="text" id="p-title" name="title" class="form-control"
          value="${isEdit ? h(item.title) : ''}" placeholder="Product title" autofocus>
      </div>
      <div class="mb-3">
        <label for="p-desc" class="form-label fw-semibold">Description</label>
        <textarea id="p-desc" name="description"
          placeholder="Optional description">${isEdit ? (item.description || '') : ''}</textarea>
      </div>
      <div class="row g-3 mb-3">
        <div class="col-sm-6">
          <label for="p-price" class="form-label fw-semibold">Price ($)</label>
          <input type="number" id="p-price" name="price" class="form-control"
            value="${isEdit && item.price != null ? item.price : ''}" placeholder="Optional" min="0" step="0.01">
        </div>
        <div class="col-sm-6">
          <label for="p-discount" class="form-label fw-semibold">Discount (%)</label>
          <input type="number" id="p-discount" name="discount" class="form-control"
            value="${isEdit ? (item.discount ?? 0) : 0}" min="0" max="100" step="1">
        </div>
      </div>
      <div class="row g-3 mb-3">
        <div class="col-sm-6">
          <label for="p-qty" class="form-label fw-semibold">Quantity</label>
          <input type="number" id="p-qty" name="quantity" class="form-control"
            value="${isEdit ? (item.quantity ?? 0) : 0}" min="0" step="1">
        </div>
        <div class="col-sm-6">
          <label for="p-priority" class="form-label fw-semibold">Priority</label>
          <input type="number" id="p-priority" name="priority" class="form-control"
            value="${isEdit ? (item.priority ?? 0) : 0}" step="1">
        </div>
      </div>
      <div class="mb-3">
        <label for="p-image" class="form-label fw-semibold">Main Image <span class="text-danger">*</span></label>
        <input type="file" id="p-image" name="image" class="form-control" accept="image/*" ${isEdit && item.image ? '' : 'required'}>
        ${isEdit && item.image ? `<div class="field-hint mt-1"><a href="${h(item.image)}" target="_blank" rel="noopener">View current image</a></div>` : ''}
        <div id="img-status" class="field-hint"></div>
      </div>
      <div class="mb-3">
        <label for="p-gallery" class="form-label fw-semibold">Gallery (multiple)</label>
        <input type="file" id="p-gallery" name="gallery" class="form-control" accept="image/*" multiple>
        ${isEdit && item.gallery?.length ? `<div class="field-hint mt-1">${item.gallery.length} image(s) in current gallery</div>` : ''}
        <div id="gal-status" class="field-hint"></div>
      </div>
      <div class="mb-3">
        <label for="p-end" class="form-label fw-semibold">Publication End Date</label>
        <input type="datetime-local" id="p-end" name="dateEndPublish" class="form-control"
          value="${isEdit && item.dateEndPublish ? item.dateEndPublish.slice(0, 16) : ''}">
      </div>
      <div class="mb-3">
        <label for="p-active" class="form-label fw-semibold">Status <span class="text-danger">*</span></label>
        <select id="p-active" name="active" class="form-select">
          <option value="true"  ${activeVal === 'true'  ? 'selected' : ''}>Active</option>
          <option value="false" ${activeVal === 'false' ? 'selected' : ''}>Inactive</option>
        </select>
      </div>
      ${metaFields}
      <div class="d-flex gap-2 mt-4 pt-3 border-top">
        <button type="submit" class="btn btn-danger">
          <i class="fas fa-save me-1"></i> ${isEdit ? 'Update' : 'Create'}
        </button>
        <button type="button" class="btn btn-secondary" id="btn-cancel">
          <i class="fas fa-times me-1"></i> Cancel
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
    placeholder: 'Optional description',
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
    status.textContent = 'Uploading...'
    try {
      imageUrl = await uploadImage(file)
      status.textContent = '✓ Image uploaded'
    } catch (err) {
      showError(err.message || 'Error uploading image')
      status.textContent = '✗ Error'
      imageUrl = item?.image || ''
    }
  })

  body.querySelector('#p-gallery').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    const status = body.querySelector('#gal-status')
    status.textContent = `Uploading ${files.length} image(s)...`
    try {
      galleryUrls = await uploadGallery(files)
      status.textContent = `✓ ${galleryUrls.length} image(s) uploaded`
    } catch (err) {
      showError(err.message || 'Error uploading gallery')
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
  btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Saving...'

  try {
    const result = item
      ? await updateProduct(item._id, data)
      : await createProduct(data)
    upsertProduct(result)
    closeModal()

    // Clear an active search that would hide the product just saved, so the
    // result of the action stays visible.
    if (searchTerm.trim() && !matchesSearch(result, searchTerm)) {
      searchTerm = ''
    }

    // Saving a product as inactive would otherwise make it vanish from the
    // grid with no explanation; reveal inactive rows so the change is visible.
    if (!result.active) {
      showInactive = true
    }

    renderList()
    showSuccess(item ? 'Product updated successfully' : 'Product created successfully')
  } catch (err) {
    showError(err.message || 'Error saving product')
    btn.disabled = false
    btn.innerHTML = `<i class="fas fa-save me-1"></i> ${item ? 'Update' : 'Create'}`
  }
}

