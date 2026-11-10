/**
 * catalog.js — Inventory Product Catalog Module
 * Fetches categories and products from the API, renders a filterable
 * product grid, and handles SPA-style navigation to product details.
 */

import { imgTag, hydrateImages, prefetchImage, responsiveSources } from './imageUtils.js';

// ─── State ────────────────────────────────────────────────────────────────────

const state = {
  categories: [],       // Category[] — active only
  products: [],         // Product[] — Published_Products
  activeFilter: 'all',  // 'all' | category.name
  currentProduct: null, // Product | null
  currentPage: 1,       // current pagination page
  pageSize: 8,          // products per page
};

// ─── API Client ───────────────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL

async function fetchCategories() {
  const res = await fetch(`${API_URL}/categories/public`);
  if (!res.ok) throw new Error(`Failed to fetch categories (${res.status})`);
  return res.json();
}

async function fetchProducts() {
  const res = await fetch(`${API_URL}/products/public?active=true`);
  if (!res.ok) throw new Error(`Failed to fetch products (${res.status})`);
  return res.json();
}

async function fetchProductById(id) {
  const res = await fetch(`${API_URL}/products/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch product (${res.status})`);
  return res.json();
}

// ─── Filtering & Grouping ─────────────────────────────────────────────────────

/**
 * Returns only Published_Products:
 *   active === true AND (dateEndPublish === null OR dateEndPublish > now)
 */
export function filterPublished(products) {
  const now = new Date();
  return products.filter(p => {
    if (!p.active) return false;
    if (p.dateEndPublish === null || p.dateEndPublish === undefined) return true;
    return new Date(p.dateEndPublish) > now;
  });
}

/**
 * Groups products into a Map<categoryName, Product[]>.
 * Only includes categories present in the categories array (matched by name).
 */
export function groupByCategory(products, categories) {
  const map = new Map();
  const validNames = new Set(categories.map(c => c.name));
  for (const cat of categories) {
    map.set(cat.name, []);
  }
  for (const product of products) {
    if (validNames.has(product.category)) {
      map.get(product.category).push(product);
    }
  }
  return map;
}

/**
 * Formats a price value as USD currency string.
 * Returns "Consultar precio" for null/undefined.
 */
export function formatPrice(price) {
  if (price === null || price === undefined) return '---';
  if (price > 0) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
  }
  return '---';
}

// ─── Skeleton & Error Renderers ───────────────────────────────────────────────

function renderSkeleton() {
  const root = document.getElementById('catalog-root');
  if (!root) return;
  root.innerHTML = `
    <div class="catalog-skeleton">
      ${Array.from({ length: 6 }).map(() => `
        <div class="skeleton-card">
          <div class="skeleton-shimmer skeleton-img"></div>
          <div class="skeleton-body">
            <div class="skeleton-shimmer skeleton-line"></div>
            <div class="skeleton-shimmer skeleton-line short"></div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderError(message) {
  const root = document.getElementById('catalog-root');
  if (!root) return;
  root.innerHTML = `<center><p class="catalog-error">${message}</p></center>`;
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

function renderFilterBar(categories, products) {
  const root = document.getElementById('catalog-root');
  if (!root) return;

  // Remove existing filter bar if present
  const existing = root.querySelector('.catalog-filter-bar');
  if (existing) existing.remove();

  const grouped = groupByCategory(products, categories);

  // Only include categories that have at least one published product
  const qualifyingCategories = categories.filter(cat => {
    const group = grouped.get(cat.name);
    return group && group.length > 0;
  });

  const bar = document.createElement('div');
  bar.className = 'catalog-filter-bar';

  // "Todos" button
  const todosBtn = document.createElement('button');
  todosBtn.className = 'filter-btn' + (state.activeFilter === 'all' ? ' active' : '');
  todosBtn.textContent = 'All';
  todosBtn.addEventListener('click', () => setActiveFilter('all'));
  bar.appendChild(todosBtn);

  // One button per qualifying category
  for (const cat of qualifyingCategories) {
    const btn = document.createElement('button');
    btn.className = 'filter-btn' + (state.activeFilter === cat.name ? ' active' : '');
    btn.textContent = cat.name;
    btn.dataset.category = cat.name;
    btn.addEventListener('click', () => setActiveFilter(cat.name));
    bar.appendChild(btn);
  }

  root.insertBefore(bar, root.firstChild);
}

// ─── Set Active Filter ────────────────────────────────────────────────────────

function setActiveFilter(categoryName) {
  state.activeFilter = categoryName;
  state.currentPage = 1; // reset to first page on filter change

  // Update active class on filter buttons
  const root = document.getElementById('catalog-root');
  if (root) {
    root.querySelectorAll('.filter-btn').forEach(btn => {
      const isAll = categoryName === 'all' && btn.textContent === 'All';
      const isMatch = btn.dataset.category === categoryName;
      btn.classList.toggle('active', isAll || isMatch);
    });
  }

  // Re-render grid with filtered products
  const filtered = categoryName === 'all'
    ? state.products
    : state.products.filter(p => p.category === categoryName);

  renderProductGrid(filtered);
}

// ─── Product Grid ─────────────────────────────────────────────────────────────

function renderProductGrid(products) {
  const root = document.getElementById('catalog-root');
  if (!root) return;

  // Remove existing grid and pagination
  root.querySelector('.product-grid')?.remove();
  root.querySelector('.catalog-pagination')?.remove();

  // Sort by priority descending
  const sorted = [...products].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  // Pagination math
  const totalPages = Math.max(1, Math.ceil(sorted.length / state.pageSize));
  state.currentPage = Math.min(state.currentPage, totalPages);
  const start = (state.currentPage - 1) * state.pageSize;
  const paginated = sorted.slice(start, start + state.pageSize);

  // Grid
  const grid = document.createElement('div');
  grid.className = 'product-grid';

  paginated.forEach((product, index) => {
    const card = document.createElement('div');
    card.className = 'product-card';

    const priceText = formatPrice(product.price);
    const discountBadge = product.discount > 0
      ? `<span class="product-card-discount">${product.discount}% OFF</span>`
      : '';

    const priceHTML = product.discount > 0
      ? `<p><b class="productb text-price-discount">${priceText}</b> <b class="product-card-price"> ${formatPrice(product.price * (product.discount / 100))}</b></p>`
      : `<p><b class="product-card-price">${priceText}</b></p>`;

    // First row loads eagerly: it is usually what the visitor sees first.
    const imageHtml = imgTag(product.image, {
      alt: product.title,
      preset: 'card',
      eager: index < 4,
      width: 320,
      height: 200,
    });

    card.innerHTML = `
      <div class="product-card-image img-frame">
        ${imageHtml}
        ${discountBadge}
      </div>
      <div class="product-card-body">
        <h3 class="product-card-title">${product.title}</h3>
        <p class="product-card-price">${priceHTML}</p>
        <span class="product-card-category">${product.category}</span>
      </div>
    `;

    card.addEventListener('click', () => showProductDetails(product._id));
    // Start downloading the large image as soon as the visitor shows intent.
    const warm = () => prefetchImage(product.image, 'detail');
    card.addEventListener('pointerenter', warm, { once: true });
    card.addEventListener('touchstart', warm, { once: true, passive: true });
    grid.appendChild(card);
  });

  root.appendChild(grid);
  hydrateImages(grid);

  // Pagination controls — only render if more than one page
  if (totalPages > 1) {
    const nav = document.createElement('div');
    nav.className = 'catalog-pagination';

    // Prev button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn' + (state.currentPage === 1 ? ' disabled' : '');
    prevBtn.disabled = state.currentPage === 1;
    prevBtn.innerHTML = '&laquo;';
    prevBtn.addEventListener('click', () => {
      if (state.currentPage > 1) {
        state.currentPage--;
        renderProductGrid(products);
        scrollToShop();
      }
    });
    nav.appendChild(prevBtn);

    // Page number buttons
    for (let i = 1; i <= totalPages; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.className = 'page-btn' + (i === state.currentPage ? ' active' : '');
      pageBtn.textContent = i;
      pageBtn.addEventListener('click', () => {
        if (i !== state.currentPage) {
          state.currentPage = i;
          renderProductGrid(products);
          scrollToShop();
        }
      });
      nav.appendChild(pageBtn);
    }

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn' + (state.currentPage === totalPages ? ' disabled' : '');
    nextBtn.disabled = state.currentPage === totalPages;
    nextBtn.innerHTML = '&raquo;';
    nextBtn.addEventListener('click', () => {
      if (state.currentPage < totalPages) {
        state.currentPage++;
        renderProductGrid(products);
        scrollToShop();
      }
    });
    nav.appendChild(nextBtn);

    root.appendChild(nav);
  }
}

function scrollToShop() {
  const shop = document.getElementById('shop');
  if (!shop) return;
  const navbarHeight = document.querySelector('.navbar')?.offsetHeight || 0;
  window.scrollTo({ top: shop.offsetTop - navbarHeight, behavior: 'smooth' });
}

// ─── Product Details ──────────────────────────────────────────────────────────

function buildShareUrl(productId) {
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('product', productId);
  url.hash = '#shop';
  return url.toString();
}

function renderProductDetails(product) {
  const detailsView = document.getElementById('product-details-view');
  if (!detailsView) return;

  const priceText = formatPrice(product.price);

  const finalPriceText =
    product.discount > 0
      ? formatPrice(product.price * (product.discount / 100))
      : priceText;

  const shareUrl = buildShareUrl(product._id);
  const shareMessage = `Hi! I'm interested in this product and would like more information: ${product.title} - ${finalPriceText}\n\nLink: ${shareUrl}`;
  const whatsappShareLink = `https://wa.me/18607171810?text=${encodeURIComponent(shareMessage)}`;
  const messengerLink = `https://m.me/tgappliance?ref=${shareUrl}`;

  const discountHtml = product.discount > 0
    ? `<p class="product-details-discount"><strong>Discount:</strong> ${product.discount}% OFF</p>`
    : '';

  const dateEndHtml = product.dateEndPublish
    ? `<p><strong>Available until:</strong> ${new Date(product.dateEndPublish).toLocaleDateString()}</p>`
    : '';

  const hasGallery = Array.isArray(product.gallery) && product.gallery.length > 0;
  const galleryHtml = hasGallery
    ? `<div class="product-details-gallery">
        ${product.gallery.map((url, i) => `
          <span class="img-frame gallery-frame">
            ${imgTag(url, {
              alt: `Gallery image ${i + 1}`,
              preset: 'thumb',
              width: 80,
              height: 80,
              className: 'gallery-thumb',
              data: { full: url },
            })}
          </span>
        `).join('')}
      </div>`
    : '';

  const priceHTML = product.discount > 0
    ? `<p><b class="productb text-price-discount">${priceText}</b> <b class="product-card-price"> ${finalPriceText}</b></p>`
    : `<p><b class="product-card-price">${priceText}</b></p>`;

  detailsView.innerHTML = `
    <div class="product-details-inner">
      <button class="product-details-back-btn">← Back to Inventory</button>
      <div class="product-details-content">
        <div class="product-details-images">
          <div class="img-frame product-details-main-frame">
            ${imgTag(product.image, {
              id: 'product-details-main-img',
              alt: product.title,
              preset: 'detail',
              eager: true,
              className: 'product-details-main-image',
            })}
          </div>
          ${galleryHtml}
        </div>
        <div class="product-details-info">
          <h2 class="product-details-title">${product.title}</h2>
          ${priceHTML} ${discountHtml}
          ${product.description ? `<div class="product-details-description">${product.description}</div>` : ''}
          ${product.quantity > 0 ? `<p><strong>Quantity available: ${product.quantity}</strong></p>` : ""}
          ${dateEndHtml}
          <hr>
          <h2 class="product-details-title">💬Talk to us now</h2>
          <div class="product-contact-buttons">
            <a href="${whatsappShareLink}" target="_blank" rel="noopener noreferrer" class="btn-whatsapp">
             <i class="fa fa-whatsapp"></i> WhatsApp
            </a>
            <a href="${messengerLink}" target="_blank" rel="noopener noreferrer" class="btn-messenger">
              <i class="fa fa-facebook"></i> Facebook
            </a>

              <a href="tel:+18602617084" class="btn-call">
                <i class="fa fa-phone"></i> Call now
              </a>

          </div>
    
        </div>
      </div>
    </div>
  `;

  detailsView.querySelector('.product-details-back-btn').addEventListener('click', () => {
    showCatalog();
  });

  hydrateImages(detailsView);

  if (hasGallery) {
    const mainImg = detailsView.querySelector('#product-details-main-img');
    const mainFrame = mainImg.closest('.img-frame');

    detailsView.querySelectorAll('.gallery-thumb').forEach(thumb => {
      const full = thumb.dataset.full;
      thumb.addEventListener('pointerenter', () => prefetchImage(full, 'detail'), { once: true });
      thumb.addEventListener('click', () => {
        const { src, srcset, sizes } = responsiveSources(full, 'detail');
        if (mainImg.getAttribute('src') !== src) {
          // Show the skeleton again until the new image is decoded.
          mainImg.classList.remove('is-loaded');
          mainFrame?.classList.remove('is-loaded');
          delete mainImg.dataset.fallback;
          if (sizes) mainImg.sizes = sizes; else mainImg.removeAttribute('sizes');
          if (srcset) mainImg.srcset = srcset; else mainImg.removeAttribute('srcset');
          mainImg.src = src;
        }
        detailsView.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
      });
    });

    // Once the main photo is in, fetch the rest of the gallery quietly.
    const warmGallery = () => product.gallery.forEach(url => prefetchImage(url, 'detail'));
    if (mainImg.complete) setTimeout(warmGallery, 300);
    else mainImg.addEventListener('load', () => setTimeout(warmGallery, 300), { once: true });
  }
}
// ─── Navigation ───────────────────────────────────────────────────────────────

function showCatalog() {
  const detailsView = document.getElementById('product-details-view');
  const catalogRoot = document.getElementById('catalog-root');

  if (detailsView) detailsView.classList.remove('active');
  if (catalogRoot) catalogRoot.style.display = '';

  // Clean up URL
  const url = new URL(window.location.href);
  url.searchParams.delete('product');
  url.hash = '#shop';
  history.pushState({}, '', url.toString());
}

async function showProductDetails(id) {
  const detailsView = document.getElementById('product-details-view');
  const catalogRoot = document.getElementById('catalog-root');

  // Show details container, hide catalog while loading
  if (catalogRoot) catalogRoot.style.display = 'none';

  // Update URL with product id (no page reload)
  const url = new URL(window.location.href);
  url.searchParams.set('product', id);
  url.hash = '#shop';
  history.pushState({ productId: id }, '', url.toString());

  // The catalog list already has every published product: render instantly
  // instead of waiting for another request.
  const cached = state.products.find(p => p._id === id);
  if (cached && detailsView) {
    state.currentProduct = cached;
    detailsView.classList.add('active');
    renderProductDetails(cached);
    return;
  }

  if (detailsView) {
    detailsView.innerHTML = `<p style="padding:2rem;color:#7f8c8d;"><i class="fas fa-spinner fa-spin"></i> Loading...</p>`;
    detailsView.classList.add('active');
  }

  try {
    const product = await fetchProductById(id);
    state.currentProduct = product;
    renderProductDetails(product);
  } catch (err) {
    console.error('showProductDetails error:', err);
    if (detailsView) {
      detailsView.innerHTML = `
        <div style="padding:2rem;">
          <button class="product-details-back-btn" id="err-back-btn">← Back to Inventory</button>
          <p style="color:#e74c3c;margin-top:1rem;">Could not load product details. Please try again later.</p>
          <p style="color:#7f8c8d;font-size:0.85rem;">${err.message}</p>
        </div>`;
      detailsView.querySelector('#err-back-btn')?.addEventListener('click', showCatalog);
    }
  }
}

function registerNavigationListeners() {
  window.addEventListener('popstate', handleNavigation);
}

function handleNavigation(e) {
  const productId = e?.state?.productId || new URL(window.location.href).searchParams.get('product');
  const detailsView = document.getElementById('product-details-view');
  const isDetailsActive = detailsView && detailsView.classList.contains('active');

  if (productId && !isDetailsActive) {
    showProductDetails(productId);
  } else if (!productId && isDetailsActive) {
    const detailsViewEl = document.getElementById('product-details-view');
    const catalogRoot = document.getElementById('catalog-root');
    if (detailsViewEl) detailsViewEl.classList.remove('active');
    if (catalogRoot) catalogRoot.style.display = '';
  }
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

export async function initCatalog() {
  renderSkeleton();
  registerNavigationListeners();

  try {
    const [rawCategories, rawProducts] = await Promise.all([
      fetchCategories(),
      fetchProducts(),
    ]);

    // Filter: active categories only, published products only
    state.categories = rawCategories.filter(c => c.active === true);
    state.products = filterPublished(rawProducts);

    // Clear skeleton and render UI
    const root = document.getElementById('catalog-root');
    if (root) root.innerHTML = '';

    renderFilterBar(state.categories, state.products);
    renderProductGrid(state.products);

    // If URL has ?product=<id>, open that product directly
    const productId = new URL(window.location.href).searchParams.get('product');
    if (productId) {
      showProductDetails(productId);
    }

  } catch (err) {
    console.error('initCatalog error:', err);
    renderError('It was not possible to load the inventory');
  }
}
