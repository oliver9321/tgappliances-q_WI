# Implementation Plan: Inventory Product Catalog

## Overview

Reemplaza la sección estática `#shop` de `index.html` con un catálogo dinámico. La implementación sigue el orden: backend → CSS → catalog.js (API client, state, renderers, navigation) → integración en main.js → HTML → tests.

`vitest` y `fast-check` ya están instalados en `package.json`.

## Tasks

- [x] 1. Backend: Add `GET /api/v1/products/:id` public endpoint
  - Add `getProductById` controller function to `backend/controllers/products.controller.js`
    - Use `Product.findById(req.params.id)`
    - Return 200 + full product object on success
    - Return 404 if product not found
    - Return 400 if `err.name === 'CastError'` (invalid ObjectId format)
    - Return 500 for other errors
  - Register the route in `backend/routes/products.routes.js` as a **public** route (no `authMiddleware`) before the protected routes: `router.get('/:id', getProductById)`
  - Import `getProductById` in the routes file
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 2. CSS: Add catalog styles to `style.css`
  - [x] 2.1 Add Category_Filter_Bar styles
    - `.catalog-filter-bar` — flex row, gap, padding, wrapping
    - `.filter-btn` — pill/tab button using `--border-color`, `--text-dark`, `--transition`
    - `.filter-btn.active` — filled background using `--accent-color`, white text
    - _Requirements: 3.5, 6.3, 6.4_

  - [x] 2.2 Add Product_Card styles
    - `.product-card` — card with border-radius, box-shadow, cursor pointer, hover lift using `--transition`
    - `.product-card-image` — fixed-height image container, `object-fit: cover`
    - `.product-card-body` — padding, flex column layout
    - `.product-card-title` — font-weight, color `--text-dark`
    - `.product-card-price` — accent color for price, muted for "Consultar precio"
    - `.product-card-category` — small badge/label using `--text-light`
    - `.product-card-discount` — badge using `--accent-color` background, white text
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.3, 6.4_

  - [x] 2.3 Add Product_Details_View styles
    - `.product-details-view` — full-width container, hidden by default (`display: none`)
    - `.product-details-view.active` — `display: block`
    - `.product-details-main-image` — large image, `object-fit: contain`, max-height
    - `.product-details-gallery` — flex row of thumbnails, gap, overflow-x auto
    - `.product-details-gallery img` — fixed size thumbnail, cursor pointer, border on hover/active
    - `.product-details-info` — grid or flex layout for fields
    - `.product-details-back-btn` — styled back button using `--primary-color` or `--accent-color`
    - _Requirements: 5.2, 5.5, 5.7, 6.3, 6.4_

  - [x] 2.4 Add skeleton loader styles
    - `.catalog-skeleton` — container for skeleton cards
    - `.skeleton-card` — same dimensions as `.product-card`
    - `.skeleton-shimmer` — animated shimmer using `@keyframes` and `background: linear-gradient`
    - _Requirements: 3.9, 6.3_

  - [x] 2.5 Add responsive breakpoints for catalog styles
    - Inside existing `@media (max-width: 768px)`: product grid becomes 1–2 columns, filter bar wraps, details view stacks vertically
    - Inside existing `@media (max-width: 480px)`: single column grid, smaller card images
    - _Requirements: 6.4_

- [x] 3. `catalog.js`: Create the ES module skeleton and API client
  - Create `catalog.js` at the project root (same level as `main.js`)
  - Export `initCatalog()` as the single public entry point
  - Define the internal `state` object: `{ categories: [], products: [], activeFilter: 'all', currentProduct: null }`
  - Implement `fetchCategories()` — `fetch('/api/v1/categories')`, throws on non-200
  - Implement `fetchProducts()` — `fetch('/api/v1/products?active=true')`, throws on non-200
  - Implement `fetchProductById(id)` — `fetch('/api/v1/products/${id}')`, throws on non-200
  - _Requirements: 1.1, 2.1, 7.1_

- [x] 4. `catalog.js`: Implement filtering and grouping logic
  - [x] 4.1 Implement `filterPublished(products)`
    - Include only products where `active === true`
    - AND `dateEndPublish === null` OR `new Date(dateEndPublish) > new Date()`
    - _Requirements: 2.2, 2.4_

  - [ ]* 4.2 Write property test for `filterPublished` (Property 2)
    - **Property 2: Filtrado de Published_Products**
    - Generate arrays of products with arbitrary `active` (boolean) and `dateEndPublish` (null, past date string, future date string) using `fc.record` + `fc.oneof`
    - Assert that every product in the result has `active === true` and (`dateEndPublish` is null or is a future date)
    - Assert that no product excluded from the result satisfies both conditions simultaneously
    - **Validates: Requirements 2.2, 2.4**

  - [x] 4.3 Implement `groupByCategory(products, categories)`
    - Returns a `Map<categoryName, Product[]>` grouping products by their `category` field
    - Only includes categories present in the `categories` array
    - _Requirements: 2.3_

  - [ ]* 4.4 Write property test for `groupByCategory` (Property 3)
    - **Property 3: Asociación producto–categoría**
    - Generate products and categories with matching/non-matching names
    - Assert that every product in a category's group has `product.category === categoryName`
    - **Validates: Requirement 2.3**

  - [x] 4.5 Implement `formatPrice(price)`
    - If `price` is null or undefined → return `"Consultar precio"`
    - If `price > 0` → return `new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)`
    - _Requirements: 4.2, 4.3_

  - [ ]* 4.6 Write property test for `formatPrice` (Property 10)
    - **Property 10: Formato de precio USD**
    - Generate positive numbers with `fc.float({ min: 0.01, max: 999999 })`
    - Assert result starts with `"$"` and contains exactly one `"."`  with two decimal digits
    - Generate null/undefined → assert result is `"Consultar precio"`
    - **Validates: Requirement 4.3**

- [x] 5. `catalog.js`: Implement skeleton and error renderers
  - Implement `renderSkeleton()` — injects `.catalog-skeleton` HTML into `#shop .container`, replacing the static `.category-grid`
  - Implement `renderError(message)` — injects a visible error `<p>` with the given message into `#shop .container`
  - _Requirements: 1.3, 1.4, 2.5, 3.9_

- [x] 6. `catalog.js`: Implement Category_Filter_Bar renderer
  - [x] 6.1 Implement `renderFilterBar(categories, products)`
    - Build the list of categories that have at least one Published_Product (use `groupByCategory`)
    - Render a "Todos" button first, then one button per qualifying category
    - Attach click handlers: call `setActiveFilter('all')` or `setActiveFilter(category.name)`
    - Apply `.active` CSS class to the button matching `state.activeFilter`
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.8_

  - [ ]* 6.2 Write property test for filter bar rendering (Properties 4 and 5)
    - **Property 4: Category_Filter_Bar refleja categorías con productos publicados**
    - Generate arbitrary sets of active categories and published products; assert that rendered buttons (excluding "Todos") match exactly the categories with ≥1 published product
    - **Property 5: "Todos" es siempre el primer botón**
    - Assert that for any catalog data, the first button in the filter bar is "Todos"
    - **Validates: Requirements 3.1, 3.2, 3.8**

  - [x] 6.3 Implement `setActiveFilter(categoryName)`
    - Update `state.activeFilter`
    - Re-render the filter bar (update `.active` class on buttons)
    - Re-render the product grid with the filtered products
    - _Requirements: 3.4, 3.5, 3.6_

  - [ ]* 6.4 Write property test for `setActiveFilter` (Properties 6 and 7)
    - **Property 6: Filtrado por categoría muestra solo sus productos**
    - Simulate clicking a random category button; assert grid contains only products of that category
    - **Property 7: Solo un botón de filtro tiene el estilo activo**
    - After any `setActiveFilter` call, assert exactly one button has the `.active` class
    - **Validates: Requirements 3.4, 3.5, 3.6**

- [x] 7. `catalog.js`: Implement Product_Card and product grid renderer
  - [x] 7.1 Implement `renderProductGrid(products)`
    - Sort products by `priority` descending before rendering
    - Render a `.product-card` for each product using `createElement` or `innerHTML`
    - Each card must include: image (or placeholder SVG/URL if `image` is null/empty), title, formatted price, category badge, discount badge (if `discount > 0`)
    - Attach click handler on each card: call `showProductDetails(product._id)`
    - _Requirements: 3.7, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 7.2 Write property test for product grid rendering (Properties 8 and 9)
    - **Property 8: Orden de productos por prioridad descendente**
    - Generate products with random `priority` values; assert rendered card order matches descending sort by `priority`
    - **Property 9: Product_Card contiene todos los campos requeridos**
    - Generate products with optional fields null/present; assert each card contains image element, title text, price text (or "Consultar precio"), category indicator, and discount badge when `discount > 0`
    - **Validates: Requirements 3.7, 4.1, 4.2, 4.3, 4.4, 4.5**

- [x] 8. `catalog.js`: Implement Product_Details_View renderer
  - [x] 8.1 Implement `renderProductDetails(product)`
    - Render the `.product-details-view` with: large main image, title, description, category, formatted price, discount (if `> 0`), quantity, active status, `dateCreation`, `createdBy` (if present), `dateEndPublish` (if present), priority indicator (if `priority > 0`)
    - If `gallery` has items, render thumbnail strip; attach click handlers to each thumbnail to swap the main image src
    - If `gallery` is empty/null, omit the gallery section entirely
    - Include a back button with id or class for the return handler
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.9_

  - [ ]* 8.2 Write property test for Product_Details_View rendering (Property 12)
    - **Property 12: Product_Details_View contiene todos los campos requeridos**
    - Generate products with varied optional fields (null description, null price, zero/positive discount, empty/populated gallery)
    - Assert rendered view contains all required fields per Requirement 5.2
    - Assert "Consultar precio" appears when `price` is null
    - Assert discount element is present only when `discount > 0`
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.9**

  - [ ]* 8.3 Write property test for gallery thumbnail click (Property 13)
    - **Property 13: Clic en miniatura de galería reemplaza imagen principal**
    - Generate products with `gallery` arrays of length 1–10 with arbitrary URL strings
    - Simulate click on a random thumbnail; assert main image `src` equals the clicked thumbnail's URL
    - **Validates: Requirement 5.5**

- [x] 9. `catalog.js`: Implement navigation (showCatalog / showProductDetails / popstate)
  - [x] 9.1 Implement `showCatalog()`
    - Hide `.product-details-view` (remove `.active` class or set `display: none`)
    - Show the catalog grid and filter bar
    - _Requirements: 5.7, 6.6_

  - [x] 9.2 Implement `showProductDetails(id)`
    - Call `fetchProductById(id)`; on success set `state.currentProduct` and call `renderProductDetails`
    - Show `.product-details-view`, hide the catalog grid
    - Push `#product-details` to `window.location.hash` via `history.pushState` or direct hash assignment
    - On fetch error, call `renderError` inside the details view
    - _Requirements: 5.1, 5.8, 6.5_

  - [x] 9.3 Register `popstate` / `hashchange` event listener
    - When `window.location.hash !== '#product-details'` and details view is active, call `showCatalog()`
    - _Requirements: 6.6_

  - [ ]* 9.4 Write property test for navigation (Properties 14 and 15)
    - **Property 14: Navegación de vuelta restaura el catálogo**
    - Simulate `showProductDetails` then `showCatalog`; assert details view is hidden and catalog is visible with the same `activeFilter` as before
    - **Property 15: Hash de URL se actualiza al abrir el detalle**
    - For any product id, after `showProductDetails` resolves, assert `window.location.hash === '#product-details'`
    - **Validates: Requirements 5.7, 6.5, 6.6**

- [x] 10. `catalog.js`: Implement `initCatalog()` entry point and wire everything together
  - Implement `initCatalog()`:
    1. Call `renderSkeleton()` immediately
    2. `await Promise.all([fetchCategories(), fetchProducts()])`
    3. Filter: keep only `active === true` categories; apply `filterPublished` to products
    4. Store results in `state.categories` and `state.products`
    5. Call `renderFilterBar` then `renderProductGrid` (with all products, `activeFilter = 'all'`)
    6. On any fetch error, call `renderError` with the appropriate message
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.5, 3.3, 3.9_

  - [ ]* 10.1 Write property test for active category filtering (Property 1)
    - **Property 1: Filtrado de categorías activas**
    - Generate arrays of categories with arbitrary `active` values
    - After `initCatalog` processes them, assert `state.categories` contains only categories where `active === true`
    - **Validates: Requirement 1.2**

- [x] 11. Checkpoint — Ensure all tests pass
  - Run `npx vitest --run` and confirm all property tests and example tests pass
  - Fix any failures before proceeding
  - Ask the user if any questions arise

- [x] 12. `main.js`: Import and call `initCatalog()`
  - Add `import { initCatalog } from './catalog.js';` at the top of `main.js`
  - Add `initCatalog();` as the last call inside the `DOMContentLoaded` listener
  - _Requirements: 6.1_

- [x] 13. `index.html`: Update `#shop` section structure
  - Replace the static `.category-grid` div (and its three hardcoded `.category-card` children) inside `#shop .container` with an empty `<div id="catalog-root"></div>` that `catalog.js` will populate
  - Keep the existing `<h2 class="section-title">Inventory</h2>` and `<p class="section-subtitle">` elements unchanged
  - Add a `<div class="product-details-view" id="product-details-view"></div>` container after `#catalog-root` (inside `.container`) for the details view
  - _Requirements: 6.2_

- [x] 14. Write example-based tests (Vitest)
  - Create `catalog.test.js` (or `catalog.spec.js`) at the project root
  - Test: `initCatalog` calls `fetch` with `/api/v1/categories` and `/api/v1/products?active=true` (mock `fetch`)
  - Test: after `initCatalog`, the static `.category-card` elements are no longer in `#shop`
  - Test: skeleton is visible before fetch resolves, hidden after
  - Test: "Todos" button is active and all published products are shown on initial load
  - Test: `import { initCatalog } from './catalog.js'` does not throw
  - _Requirements: 1.1, 2.1, 3.3, 3.9, 6.2_

- [x] 15. Write backend integration tests
  - Create `backend/products.routes.test.js` (or equivalent using Vitest + supertest, or a simple fetch-based test)
  - Test: `GET /api/v1/products/:id` with a valid existing ObjectId → 200 + full product JSON
  - Test: `GET /api/v1/products/:id` with a valid ObjectId that does not exist → 404
  - Test: `GET /api/v1/products/:id` with an invalid ObjectId format → 400
  - _Requirements: 7.2, 7.3, 7.4_

- [x] 16. Final checkpoint — Ensure all tests pass
  - Run `npx vitest --run` (frontend) and backend tests
  - Verify the catalog renders correctly in the browser by running `npm run dev`
  - Ensure no existing functionality is broken (slideshow, mobile menu, contact form, smooth scroll)
  - Ask the user if any questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- `fast-check` and `vitest` are already installed — no additional `npm install` needed
- The `catalog.js` file lives at the project root alongside `main.js`, per the project structure conventions
- All CSS additions go into `style.css` using existing CSS variables from `:root`; no new variables needed
- The `#catalog-root` div is the mount point for both the filter bar and the product grid
- Property tests should use `jsdom` environment (configure in `vitest.config` or via `@vitest/environment-jsdom` if DOM assertions are needed)
- Each property test references its property number from `design.md` for traceability
