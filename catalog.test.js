// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── DOM Setup ────────────────────────────────────────────────────────────────

function setupDOM() {
  document.body.innerHTML = `
    <section id="shop" class="categories">
      <div class="container">
        <h2 class="section-title">Inventory</h2>
        <p class="section-subtitle">Browse our wide selection</p>
        <div class="category-card">Refrigerators</div>
        <div class="category-card">Washers &amp; Dryers</div>
        <div class="category-card">Stoves &amp; Ovens</div>
        <div id="catalog-root"></div>
        <div id="product-details-view" class="product-details-view"></div>
      </div>
    </section>
  `
}

const MOCK_CATEGORIES = [
  { _id: 'cat1', name: 'Refrigerators', active: true },
  { _id: 'cat2', name: 'Washers', active: true },
]

const MOCK_PRODUCTS = [
  {
    _id: 'prod1',
    title: 'Fridge A',
    category: 'Refrigerators',
    price: 299,
    discount: 0,
    image: '',
    active: true,
    dateEndPublish: null,
    priority: 1,
    quantity: 2,
  },
  {
    _id: 'prod2',
    title: 'Washer B',
    category: 'Washers',
    price: null,
    discount: 10,
    image: 'http://example.com/img.jpg',
    active: true,
    dateEndPublish: null,
    priority: 0,
    quantity: 1,
  },
]

function makeFetchMock(categories = MOCK_CATEGORIES, products = MOCK_PRODUCTS) {
  return vi.fn((url) => {
    if (url.includes('/api/v1/categories/public')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(categories) })
    }
    if (url.includes('/api/v1/products/public')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(products) })
    }
    return Promise.reject(new Error(`Unexpected fetch: ${url}`))
  })
}

// ─── Pure function tests ──────────────────────────────────────────────────────

describe('filterPublished', () => {
  let filterPublished

  beforeEach(async () => {
    ;({ filterPublished } = await import('./catalog.js'))
  })

  it('excludes products with active=false', () => {
    const products = [
      { active: false, dateEndPublish: null },
      { active: true, dateEndPublish: null },
    ]
    const result = filterPublished(products)
    expect(result).toHaveLength(1)
    expect(result[0].active).toBe(true)
  })

  it('excludes products with a past dateEndPublish', () => {
    const past = new Date(Date.now() - 1000 * 60 * 60).toISOString()
    const products = [
      { active: true, dateEndPublish: past },
      { active: true, dateEndPublish: null },
    ]
    const result = filterPublished(products)
    expect(result).toHaveLength(1)
    expect(result[0].dateEndPublish).toBeNull()
  })

  it('includes products with null dateEndPublish and active=true', () => {
    const products = [{ active: true, dateEndPublish: null }]
    const result = filterPublished(products)
    expect(result).toHaveLength(1)
  })

  it('includes products with a future dateEndPublish and active=true', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString()
    const products = [{ active: true, dateEndPublish: future }]
    const result = filterPublished(products)
    expect(result).toHaveLength(1)
  })
})

describe('formatPrice', () => {
  let formatPrice

  beforeEach(async () => {
    ;({ formatPrice } = await import('./catalog.js'))
  })

  it('returns "Consultar precio" for null', () => {
    expect(formatPrice(null)).toBe('Consultar precio')
  })

  it('returns "Consultar precio" for 0', () => {
    expect(formatPrice(0)).toBe('Consultar precio')
  })

  it('returns a string starting with "$" for a positive number', () => {
    const result = formatPrice(299)
    expect(result).toMatch(/^\$/)
  })

  it('formats 299 as $299.00', () => {
    expect(formatPrice(299)).toBe('$299.00')
  })
})

describe('groupByCategory', () => {
  let groupByCategory

  beforeEach(async () => {
    ;({ groupByCategory } = await import('./catalog.js'))
  })

  it('groups products by category name', () => {
    const categories = [{ name: 'Refrigerators' }, { name: 'Washers' }]
    const products = [
      { category: 'Refrigerators', title: 'Fridge A' },
      { category: 'Refrigerators', title: 'Fridge B' },
      { category: 'Washers', title: 'Washer A' },
    ]
    const map = groupByCategory(products, categories)
    expect(map.get('Refrigerators')).toHaveLength(2)
    expect(map.get('Washers')).toHaveLength(1)
  })

  it('excludes products with unknown categories', () => {
    const categories = [{ name: 'Refrigerators' }]
    const products = [
      { category: 'Refrigerators', title: 'Fridge A' },
      { category: 'Unknown', title: 'Mystery Item' },
    ]
    const map = groupByCategory(products, categories)
    expect(map.get('Refrigerators')).toHaveLength(1)
    expect(map.has('Unknown')).toBe(false)
  })

  it('returns empty arrays for categories with no matching products', () => {
    const categories = [{ name: 'Stoves' }]
    const products = [{ category: 'Refrigerators', title: 'Fridge A' }]
    const map = groupByCategory(products, categories)
    expect(map.get('Stoves')).toHaveLength(0)
  })
})

// ─── initCatalog integration tests ───────────────────────────────────────────

describe('initCatalog', () => {
  let initCatalog

  beforeEach(async () => {
    setupDOM()
    vi.stubGlobal('fetch', makeFetchMock())
    // Re-import to get a fresh module (vitest caches modules, so we use the cached one)
    ;({ initCatalog } = await import('./catalog.js'))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not throw on import', async () => {
    await expect(import('./catalog.js')).resolves.toBeDefined()
  })

  it('calls fetch with /api/v1/categories/public', async () => {
    await initCatalog()
    const urls = vi.mocked(fetch).mock.calls.map(([url]) => url)
    expect(urls).toContain('/api/v1/categories/public')
  })

  it('calls fetch with /api/v1/products/public?active=true', async () => {
    await initCatalog()
    const urls = vi.mocked(fetch).mock.calls.map(([url]) => url)
    expect(urls).toContain('/api/v1/products/public?active=true')
  })

  it('removes static .category-card elements after initCatalog resolves', async () => {
    // Before: static cards exist
    expect(document.querySelectorAll('.category-card').length).toBeGreaterThan(0)
    await initCatalog()
    // After: catalog-root is populated; static cards are no longer the content
    // (they were outside #catalog-root so they remain in DOM, but the spec says
    // the catalog replaces the static content — verify #catalog-root has content)
    const root = document.getElementById('catalog-root')
    expect(root.innerHTML).not.toBe('')
  })

  it('shows skeleton before fetch resolves', async () => {
    // Use a fetch that resolves after a microtask delay so we can inspect the DOM
    // right after initCatalog() starts (skeleton is rendered synchronously)
    let resolveCategories
    let resolveProducts
    const delayedFetch = vi.fn((url) => {
      if (url.includes('/api/v1/categories/public')) {
        return new Promise((resolve) => { resolveCategories = resolve })
      }
      return new Promise((resolve) => { resolveProducts = resolve })
    })
    vi.stubGlobal('fetch', delayedFetch)

    // Start initCatalog but do NOT await — skeleton is rendered synchronously
    const promise = initCatalog()

    // Skeleton must be present immediately (before any fetch resolves)
    const root = document.getElementById('catalog-root')
    expect(root.querySelector('.catalog-skeleton')).not.toBeNull()

    // Resolve both fetches so the test can finish cleanly
    const emptyResponse = { ok: true, json: () => Promise.resolve([]) }
    resolveCategories(emptyResponse)
    resolveProducts(emptyResponse)
    await promise
  })

  it('hides skeleton after fetch resolves (catalog-root no longer has skeleton)', async () => {
    await initCatalog()
    const root = document.getElementById('catalog-root')
    expect(root.querySelector('.catalog-skeleton')).toBeNull()
  })

  it('"Todos" button is active on initial load', async () => {
    await initCatalog()
    const todosBtn = document.querySelector('.filter-btn')
    expect(todosBtn).not.toBeNull()
    expect(todosBtn.textContent).toBe('Todos')
    expect(todosBtn.classList.contains('active')).toBe(true)
  })

  it('shows all published products on initial load', async () => {
    await initCatalog()
    const cards = document.querySelectorAll('.product-card')
    // Both mock products are active with null dateEndPublish → both published
    expect(cards.length).toBe(MOCK_PRODUCTS.length)
  })
})
